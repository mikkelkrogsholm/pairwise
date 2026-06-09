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

import type { Idea } from "./db.ts";
import { getPairVote, getPairVotes, listActiveIdeas } from "./db.ts";

export const TAU = 0.05;
const EXACT_PAIR_LIMIT = 80_000;
const SAMPLED_PAIR_CANDIDATES = 2_000;

export function scoreOf(wins: number, losses: number): number {
  return ((wins + 1) / (wins + losses + 2)) * 100;
}

export interface ChosenPair {
  left: Idea;
  right: Idea;
}

export function choosePair(surveyId: number): ChosenPair | null {
  const ideas = listActiveIdeas(surveyId);
  if (ideas.length < 2) return null;

  const totalPairs = (ideas.length * (ideas.length - 1)) / 2;
  if (totalPairs > EXACT_PAIR_LIMIT) return chooseSampledPair(surveyId, ideas);

  const pairVotes = getPairVotes(surveyId);

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
    }
  }

  let left = ideas[chosen[0]];
  let right = ideas[chosen[1]];
  if (Math.random() < 0.5) [left, right] = [right, left]; // randomise sides
  return { left, right };
}

function chooseSampledPair(surveyId: number, ideas: Idea[]): ChosenPair | null {
  let total = 0;
  let chosen: [number, number] | null = null;
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
  }

  if (!chosen) chosen = [0, 1];
  let left = ideas[chosen[0]];
  let right = ideas[chosen[1]];
  if (Math.random() < 0.5) [left, right] = [right, left];
  return { left, right };
}
