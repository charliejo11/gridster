import { describe, expect, it } from "vitest";
import {
  LANDMARK_MATCH_ROUNDS,
  REACTION_MAX_DELAY_MS,
  REACTION_MIN_DELAY_MS,
  REGION_GUESS_ROUNDS,
  isCorrectChoice,
  reactionDelayMs,
  scoreReactionTap,
  shuffleItems,
  sumReactionPoints,
} from "./gridsterMiniGames.js";

describe("mini-game rounds", () => {
  it("keeps every landmark and region answer inside its choices", () => {
    for (const round of [...LANDMARK_MATCH_ROUNDS, ...REGION_GUESS_ROUNDS]) {
      expect(round.choices).toContain(round.answer);
      expect(isCorrectChoice(round, round.answer)).toBe(true);
      expect(isCorrectChoice(round, "not-a-choice")).toBe(false);
    }
  });
});

describe("shuffleItems", () => {
  it("returns the same members in a new array", () => {
    const items = ["Ahern", "Da Boom", "Waterhead"];
    const shuffled = shuffleItems(items, () => 0);

    expect(shuffled).toEqual(["Da Boom", "Waterhead", "Ahern"]);
    expect(items).toEqual(["Ahern", "Da Boom", "Waterhead"]);
  });

  it("handles an empty list", () => {
    expect(shuffleItems()).toEqual([]);
  });
});

describe("reactionDelayMs", () => {
  it("stays inside the rez window", () => {
    expect(reactionDelayMs(() => 0)).toBe(REACTION_MIN_DELAY_MS);
    expect(reactionDelayMs(() => 0.999999)).toBe(REACTION_MAX_DELAY_MS);
  });
});

describe("scoreReactionTap", () => {
  it("scores a false start as too soon", () => {
    expect(scoreReactionTap({ wentLive: false, tappedAt: 10, liveAt: 20 })).toMatchObject({
      tooSoon: true,
      points: 0,
    });
  });

  it("scores taps on the band boundaries", () => {
    expect(scoreReactionTap({ wentLive: true, tappedAt: 179, liveAt: 0 }).points).toBe(100);
    expect(scoreReactionTap({ wentLive: true, tappedAt: 180, liveAt: 0 }).points).toBe(70);
    expect(scoreReactionTap({ wentLive: true, tappedAt: 320, liveAt: 0 }).points).toBe(40);
    expect(scoreReactionTap({ wentLive: true, tappedAt: 550, liveAt: 0 }).points).toBe(15);
  });

  it("treats a tap before the live moment as too soon", () => {
    expect(scoreReactionTap({ wentLive: true, tappedAt: 10, liveAt: 11 }).tooSoon).toBe(true);
  });
});

describe("sumReactionPoints", () => {
  it("adds round points and ignores a missing list", () => {
    expect(sumReactionPoints([{ points: 100 }, { points: 0 }, { points: 40 }])).toBe(140);
    expect(sumReactionPoints()).toBe(0);
  });
});
