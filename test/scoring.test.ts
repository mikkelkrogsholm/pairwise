import { describe, expect, test } from "bun:test";
import {
  bayesianScore,
  bradleyTerryScores,
  effectiveScoreMethod,
  rawWinRateScore,
  scoreIdeas,
} from "../src/scoring.ts";
import type { Idea } from "../src/db.ts";

function idea(id: number, wins: number, losses: number): Idea {
  return {
    id,
    survey_id: 1,
    text: `Idea ${id}`,
    active: 1,
    wins,
    losses,
    score: bayesianScore(wins, losses),
    submitted: 0,
    media: null,
    media_kind: null,
    created_at: "2026-01-01 00:00:00",
  };
}

describe("score formulas", () => {
  test("bayesian scoring keeps zero-data ideas neutral", () => {
    expect(bayesianScore(0, 0)).toBe(50);
    expect(bayesianScore(3, 1)).toBeCloseTo((4 / 6) * 100, 8);
  });

  test("raw win rate uses the observed share of wins", () => {
    expect(rawWinRateScore(0, 0)).toBe(50);
    expect(rawWinRateScore(3, 1)).toBe(75);
  });
});

describe("scoreIdeas", () => {
  test("sorts by the selected score method", () => {
    const ideas = [idea(1, 1, 0), idea(2, 9, 1), idea(3, 0, 10)];

    expect(scoreIdeas(ideas, "raw").map((row) => row.id)).toEqual([1, 2, 3]);
    expect(scoreIdeas(ideas, "bayesian").map((row) => row.id)).toEqual([2, 1, 3]);
  });

  test("reports the Bayesian fallback for very large Bradley-Terry surveys", () => {
    expect(effectiveScoreMethod("bradley_terry", 750)).toBe("bradley_terry");
    expect(effectiveScoreMethod("bradley_terry", 751)).toBe("bayesian");
  });
});

describe("bradleyTerryScores", () => {
  test("uses opponent-adjusted comparisons", () => {
    const ideas = [idea(1, 1, 0), idea(2, 8, 1), idea(3, 0, 8)];
    const votes = [
      { winner_id: 1, loser_id: 2 },
      ...Array.from({ length: 8 }, () => ({ winner_id: 2, loser_id: 3 })),
    ];

    const scores = bradleyTerryScores(ideas, votes).sort((a, b) => b.score - a.score);

    expect(scores.map((row) => row.id)).toEqual([1, 2, 3]);
    expect(scores[0].score).toBeGreaterThan(50);
    expect(scores[2].score).toBeLessThan(50);
  });
});
