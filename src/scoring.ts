import type { Idea } from "./db.ts";

export const SCORE_METHODS = ["bayesian", "raw", "bradley_terry"] as const;
export type ScoreMethod = (typeof SCORE_METHODS)[number];

export interface VoteOutcome {
  winner_id: number;
  loser_id: number;
  count?: number;
}

export type ScoredIdea = Idea & {
  score: number;
};

export const BRADLEY_TERRY_IDEA_LIMIT = 750;

export function isScoreMethod(value: string | null | undefined): value is ScoreMethod {
  return SCORE_METHODS.includes(value as ScoreMethod);
}

export function scoreMethodOrDefault(value: string | null | undefined): ScoreMethod {
  return isScoreMethod(value) ? value : "bayesian";
}

export function effectiveScoreMethod(method: ScoreMethod, ideaCount: number): ScoreMethod {
  return method === "bradley_terry" && ideaCount > BRADLEY_TERRY_IDEA_LIMIT ? "bayesian" : method;
}

export function bayesianScore(wins: number, losses: number): number {
  const w = nonNegative(wins);
  const l = nonNegative(losses);
  return ((w + 1) / (w + l + 2)) * 100;
}

export function rawWinRateScore(wins: number, losses: number): number {
  const w = nonNegative(wins);
  const l = nonNegative(losses);
  const total = w + l;
  return total === 0 ? 50 : (w / total) * 100;
}

export function scoreIdeas(
  ideas: Idea[],
  method: ScoreMethod,
  votes: VoteOutcome[] = [],
): ScoredIdea[] {
  const actualMethod = effectiveScoreMethod(method, ideas.length);
  const scored =
    actualMethod === "raw"
      ? ideas.map((idea) => ({ ...idea, score: rawWinRateScore(idea.wins, idea.losses) }))
      : actualMethod === "bradley_terry"
        ? bradleyTerryScores(ideas, votes)
        : ideas.map((idea) => ({ ...idea, score: bayesianScore(idea.wins, idea.losses) }));

  return scored.sort((a, b) => b.score - a.score || b.wins - a.wins || a.id - b.id);
}

export function bradleyTerryScores(ideas: Idea[], votes: VoteOutcome[]): ScoredIdea[] {
  if (ideas.length < 2) return ideas.map((idea) => ({ ...idea, score: 50 }));

  const ids = ideas.map((idea) => idea.id);
  const indexById = new Map(ids.map((id, index) => [id, index]));
  const usableVotes = votes
    .map((vote) => ({
      winner: indexById.get(vote.winner_id),
      loser: indexById.get(vote.loser_id),
      count: nonNegative(vote.count ?? 1),
    }))
    .filter(
      (vote): vote is { winner: number; loser: number; count: number } =>
        vote.winner !== undefined && vote.loser !== undefined,
    );

  if (usableVotes.length === 0) return ideas.map((idea) => ({ ...idea, score: 50 }));

  const theta = Array(ideas.length).fill(0) as number[];
  const learningRate = 0.04;
  const regularization = 0.08;

  for (let iter = 0; iter < 160; iter++) {
    const gradient = theta.map((value) => -regularization * value);

    for (const vote of usableVotes) {
      const p = sigmoid(theta[vote.winner] - theta[vote.loser]);
      const residual = (vote.count ?? 1) * (1 - p);
      gradient[vote.winner] += residual;
      gradient[vote.loser] -= residual;
    }

    for (let i = 0; i < theta.length; i++) theta[i] += learningRate * gradient[i];

    const mean = theta.reduce((sum, value) => sum + value, 0) / theta.length;
    for (let i = 0; i < theta.length; i++) theta[i] -= mean;
  }

  return ideas.map((idea, i) => {
    let total = 0;
    for (let j = 0; j < theta.length; j++) {
      if (i !== j) total += sigmoid(theta[i] - theta[j]);
    }
    return { ...idea, score: (total / (theta.length - 1)) * 100 };
  });
}

function sigmoid(x: number): number {
  if (x >= 0) {
    const z = Math.exp(-x);
    return 1 / (1 + z);
  }
  const z = Math.exp(x);
  return z / (1 + z);
}

function nonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}
