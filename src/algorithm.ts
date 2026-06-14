// The two ideas borrowed faithfully from All Our Ideas' pairwise-api:
//
//  1. Score   = (wins + 1) / (wins + losses + 2) * 100
//               The posterior mean of a Beta(1,1) win-rate, scaled to 0–100.
//               A brand-new idea sits at a neutral 50.
//
//  2. "Catchup" selection — for every possible unordered pair the weight is
//               weight(pair) = min( 1 / (pair_votes + 1) , TAU )
//               and the next pair is drawn at random in proportion to weight.
//               Effect: every pair with few votes is explored roughly equally
//               (so freshly-added ideas immediately enter the pool), while
//               settled pairs are progressively starved.
//
// The original precomputes 1000 pairs into Redis. We just compute the weights
// per request straight from SQLite — simple and fast for self-hosted surveys.
// Selection is O(N^2) in the number of active ideas; comfortable into the
// hundreds. Past a few thousand ideas you'd want the batched/cached approach.

import type { Idea, PairSelectionStats } from "./db.ts";
import { getPairVote, getPairVotes, listActiveIdeas, pairSelectionStats } from "./db.ts";

export const TAU = 0.05;
export const ADAPTIVE_COVERAGE_TARGET = 8;
const EXACT_PAIR_LIMIT = 80_000;
const SAMPLED_PAIR_CANDIDATES = 2_000;

export function scoreOf(wins: number, losses: number): number {
  return ((wins + 1) / (wins + losses + 2)) * 100;
}

export interface ChosenPair {
  left: Idea;
  right: Idea;
}

interface Candidate {
  left: Idea;
  right: Idea;
}

export function choosePair(surveyId: number, voterId = ""): ChosenPair | null {
  const ideas = listActiveIdeas(surveyId);
  if (ideas.length < 2) return null;

  const stats = pairSelectionStats(surveyId, voterId);
  const totalPairs = (ideas.length * (ideas.length - 1)) / 2;
  if (totalPairs > EXACT_PAIR_LIMIT) return chooseSampledPair(surveyId, ideas, stats);

  const pairVotes = getPairVotes(surveyId);
  const candidates: Candidate[] = [];

  let total = 0;
  let chosen: [number, number] = [0, 1];

  for (let i = 0; i < ideas.length; i++) {
    for (let j = i + 1; j < ideas.length; j++) {
      const a = ideas[i].id;
      const b = ideas[j].id;
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      const votes = pairVotes.get(key) ?? 0;
      const w = Math.min(1 / (votes + 1), TAU);
      total += w;

      if (Math.random() * total < w) chosen = [i, j];
      candidates.push({ left: ideas[i], right: ideas[j] });
    }
  }

  let { left, right } = chooseBalancedCandidate(candidates, stats) ?? {
    left: ideas[chosen[0]],
    right: ideas[chosen[1]],
  };
  if (Math.random() < 0.5) [left, right] = [right, left]; // randomise sides
  return { left, right };
}

function chooseSampledPair(surveyId: number, ideas: Idea[], stats: PairSelectionStats): ChosenPair | null {
  let total = 0;
  let chosen: [number, number] | null = null;
  const candidates: Candidate[] = [];
  const seen = new Set<string>();
  const maxAttempts = SAMPLED_PAIR_CANDIDATES * 4;

  for (let attempt = 0; seen.size < SAMPLED_PAIR_CANDIDATES && attempt < maxAttempts; attempt++) {
    let i = Math.floor(Math.random() * ideas.length);
    let j = Math.floor(Math.random() * ideas.length);
    if (i === j) continue;
    if (i > j) [i, j] = [j, i];
    const key = `${ideas[i].id}:${ideas[j].id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const votes = getPairVote(surveyId, ideas[i].id, ideas[j].id);
    const w = Math.min(1 / (votes + 1), TAU);
    total += w;

    if (Math.random() * total < w) chosen = [i, j];
    candidates.push({ left: ideas[i], right: ideas[j] });
  }

  const balanced = chooseBalancedCandidate(candidates, stats);
  if (balanced) {
    let { left, right } = balanced;
    if (Math.random() < 0.5) [left, right] = [right, left];
    return { left, right };
  }

  if (!chosen) chosen = [0, 1];
  let left = ideas[chosen[0]];
  let right = ideas[chosen[1]];
  if (Math.random() < 0.5) [left, right] = [right, left];
  return { left, right };
}

function chooseBalancedCandidate(candidates: Candidate[], stats: PairSelectionStats): Candidate | null {
  if (!candidates.length) return null;

  let eligible = candidates;
  const unseenByVoter = eligible.filter((candidate) => pairShows(stats.voterPairShows, candidate) === 0);
  if (unseenByVoter.length) eligible = unseenByVoter;

  const minVoterShows = Math.min(
    ...eligible.flatMap((candidate) => [
      ideaShows(stats.voterIdeaShows, candidate.left),
      ideaShows(stats.voterIdeaShows, candidate.right),
    ]),
  );
  const exposureBalanced = eligible.filter(
    (candidate) =>
      ideaShows(stats.voterIdeaShows, candidate.left) === minVoterShows ||
      ideaShows(stats.voterIdeaShows, candidate.right) === minVoterShows,
  );
  if (exposureBalanced.length) eligible = exposureBalanced;

  const minPairShows = Math.min(...eligible.map((candidate) => pairShows(stats.pairShows, candidate)));
  const pairBalanced = eligible.filter((candidate) => pairShows(stats.pairShows, candidate) === minPairShows);
  if (pairBalanced.length) eligible = pairBalanced;

  const minGlobalShows = Math.min(
    ...eligible.flatMap((candidate) => [
      ideaShows(stats.ideaShows, candidate.left),
      ideaShows(stats.ideaShows, candidate.right),
    ]),
  );
  const globallyBalanced = eligible.filter(
    (candidate) =>
      ideaShows(stats.ideaShows, candidate.left) === minGlobalShows ||
      ideaShows(stats.ideaShows, candidate.right) === minGlobalShows,
  );
  if (globallyBalanced.length) eligible = globallyBalanced;

  const activePhase = minVoterShows >= ADAPTIVE_COVERAGE_TARGET;
  return weightedChoice(eligible, (candidate) => candidateWeight(candidate, stats, activePhase));
}

function weightedChoice(candidates: Candidate[], weightOf: (candidate: Candidate) => number): Candidate {
  let total = 0;
  let chosen = candidates[0];
  for (const candidate of candidates) {
    const weight = Math.max(weightOf(candidate), Number.EPSILON);
    total += weight;
    if (Math.random() * total < weight) chosen = candidate;
  }
  return chosen;
}

function candidateWeight(candidate: Candidate, stats: PairSelectionStats, activePhase: boolean): number {
  const pairPenalty = pairShows(stats.pairShows, candidate) + 1;
  const leftVoterShows = ideaShows(stats.voterIdeaShows, candidate.left);
  const rightVoterShows = ideaShows(stats.voterIdeaShows, candidate.right);
  const exposurePenalty = Math.max(leftVoterShows, rightVoterShows) + 1;
  const coverageWeight = 1 / (pairPenalty * exposurePenalty);
  if (!activePhase) return coverageWeight;

  const scoreGap = Math.abs(candidate.left.score - candidate.right.score);
  const closeness = 1 / (scoreGap + 4);
  const leftUncertainty = 1 / (candidate.left.wins + candidate.left.losses + 2);
  const rightUncertainty = 1 / (candidate.right.wins + candidate.right.losses + 2);
  return coverageWeight * (1 + 6 * closeness + leftUncertainty + rightUncertainty);
}

function pairShows(map: Map<string, number>, candidate: Candidate): number {
  const a = Math.min(candidate.left.id, candidate.right.id);
  const b = Math.max(candidate.left.id, candidate.right.id);
  return map.get(`${a}:${b}`) ?? 0;
}

function ideaShows(map: Map<number, number>, idea: Idea): number {
  return map.get(idea.id) ?? 0;
}
