import { describe, expect, it } from "vitest";
import { difficultyLabel, formatTimeRemaining, leaderboardDisplayName, withLeaderboardNames } from "./gridsterGameTrivia.js";

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

describe("leaderboardDisplayName", () => {
  it("prefers a display name over the Second Life username", () => {
    expect(leaderboardDisplayName({ display_name: "CharlieJo", sl_username: "charliejo11.resident" })).toBe("CharlieJo");
  });

  it("falls back to the Second Life username when the display name is blank", () => {
    expect(leaderboardDisplayName({ display_name: "  ", sl_username: "charliejo11.resident" })).toBe("charliejo11.resident");
  });

  it("never shows a raw user id when the profile is missing", () => {
    expect(leaderboardDisplayName(null)).toBe("Resident");
    expect(leaderboardDisplayName({})).toBe("Resident");
  });
});

describe("withLeaderboardNames", () => {
  it("attaches avatar and display name from the profile map", () => {
    const profiles = new Map([
      ["user-1", { display_name: "Nova", avatar_url: "https://example.com/nova.png" }],
    ]);

    expect(withLeaderboardNames([{ user_id: "user-1", score: 40 }], profiles)).toEqual([
      {
        user_id: "user-1",
        score: 40,
        display_name: "Nova",
        avatar_url: "https://example.com/nova.png",
      },
    ]);
  });

  it("labels a score with no profile as Resident", () => {
    expect(withLeaderboardNames([{ user_id: "user-2", score: 10 }], new Map())[0].display_name).toBe("Resident");
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
