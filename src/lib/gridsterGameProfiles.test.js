import { describe, expect, it } from "vitest";
import { levelForXp, titleForLevel, xpProgress } from "./gridsterGameProfiles.js";

const LEVELS = [
  { level: 1, xp_required: 0 },
  { level: 2, xp_required: 50 },
  { level: 3, xp_required: 200 },
];

const TITLES = [
  { level_threshold: 1, title: "Grid Rookie" },
  { level_threshold: 2, title: "Button Masher" },
];

describe("levelForXp", () => {
  it("stays at level 1 below the first threshold", () => {
    expect(levelForXp(0, LEVELS)).toBe(1);
    expect(levelForXp(49, LEVELS)).toBe(1);
  });

  it("advances exactly at a threshold, not one XP short", () => {
    expect(levelForXp(50, LEVELS)).toBe(2);
    expect(levelForXp(49, LEVELS)).toBe(1);
  });

  it("reaches the highest defined level for very large XP", () => {
    expect(levelForXp(1_000_000, LEVELS)).toBe(3);
  });

  it("is stable regardless of input ordering", () => {
    const shuffled = [LEVELS[2], LEVELS[0], LEVELS[1]];
    expect(levelForXp(60, shuffled)).toBe(2);
  });

  it("defaults to level 1 with no level data", () => {
    expect(levelForXp(500, [])).toBe(1);
  });
});

describe("titleForLevel", () => {
  it("has no title before the first threshold", () => {
    expect(titleForLevel(0, TITLES)).toBe(null);
  });

  it("picks the highest unlocked title, not the first match", () => {
    expect(titleForLevel(2, TITLES)).toBe("Button Masher");
    expect(titleForLevel(10, TITLES)).toBe("Button Masher");
  });
});

describe("xpProgress", () => {
  it("reports 0% right at the start of a level", () => {
    const progress = xpProgress(50, LEVELS);
    expect(progress.level).toBe(2);
    expect(progress.progressRatio).toBe(0);
  });

  it("reports partial progress toward the next level", () => {
    const progress = xpProgress(125, LEVELS);
    expect(progress.level).toBe(2);
    expect(progress.nextLevel).toBe(3);
    expect(progress.progressRatio).toBeCloseTo(0.5);
  });

  it("caps at a full bar (1) once past the highest defined level, never overflowing", () => {
    const progress = xpProgress(10_000, LEVELS);
    expect(progress.level).toBe(3);
    expect(progress.nextLevel).toBe(null);
    expect(progress.progressRatio).toBe(1);
  });
});
