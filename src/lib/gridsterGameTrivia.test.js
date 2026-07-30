import { describe, expect, it } from "vitest";
import { difficultyLabel, formatTimeRemaining } from "./gridsterGameTrivia.js";

describe("formatTimeRemaining", () => {
  it("counts down in whole seconds for a future expiry", () => {
    const expiresAt = new Date(Date.now() + 30_000).toISOString();
    expect(formatTimeRemaining(expiresAt)).toBe("30s");
  });

  it("reports time's up once expiry has passed, never a negative count", () => {
    const expiresAt = new Date(Date.now() - 5_000).toISOString();
    expect(formatTimeRemaining(expiresAt)).toBe("Time's up");
  });

  it("reports time's up exactly at expiry", () => {
    const expiresAt = new Date(Date.now()).toISOString();
    expect(formatTimeRemaining(expiresAt)).toBe("Time's up");
  });
});

describe("difficultyLabel", () => {
  it("title-cases each known difficulty", () => {
    expect(difficultyLabel("easy")).toBe("Easy");
    expect(difficultyLabel("medium")).toBe("Medium");
    expect(difficultyLabel("hard")).toBe("Hard");
  });

  it("falls back to the raw value for an unknown difficulty", () => {
    expect(difficultyLabel("nightmare")).toBe("nightmare");
  });

  it("falls back to an empty string for a missing difficulty", () => {
    expect(difficultyLabel(null)).toBe("");
    expect(difficultyLabel(undefined)).toBe("");
  });
});
