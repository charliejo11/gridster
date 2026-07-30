import { describe, expect, it } from "vitest";
import { formatBattleCountdown, normalizePhotoBattleEntryForm } from "./gridsterGamePhotoBattles.js";

describe("normalizePhotoBattleEntryForm", () => {
  it("trims caption whitespace", () => {
    const result = normalizePhotoBattleEntryForm({ photo_url: "example.com/a.png", caption: "  hi there  " });
    expect(result.caption).toBe("hi there");
  });

  it("adds https:// to a bare domain photo_url but leaves a full URL alone", () => {
    expect(normalizePhotoBattleEntryForm({ photo_url: "example.com/pic.png" }).photo_url).toBe(
      "https://example.com/pic.png"
    );
    expect(normalizePhotoBattleEntryForm({ photo_url: "http://example.com/pic.png" }).photo_url).toBe(
      "http://example.com/pic.png"
    );
    expect(normalizePhotoBattleEntryForm({ photo_url: "https://example.com/pic.png" }).photo_url).toBe(
      "https://example.com/pic.png"
    );
  });

  it("defaults missing fields to empty strings rather than throwing", () => {
    expect(normalizePhotoBattleEntryForm({})).toEqual({ photo_url: "", caption: "" });
  });
});

describe("formatBattleCountdown", () => {
  it("reports Closed once close_at has passed", () => {
    const closeAt = new Date(Date.now() - 1_000).toISOString();
    expect(formatBattleCountdown(closeAt)).toBe("Closed");
  });

  it("formats minutes-only when under an hour remains", () => {
    // +5s buffer above the exact 30-minute boundary so test execution time
    // can never nudge the computed minutes down across the boundary.
    const closeAt = new Date(Date.now() + 30 * 60 * 1000 + 5_000).toISOString();
    expect(formatBattleCountdown(closeAt)).toBe("30m left");
  });

  it("formats hours and minutes when under a day remains", () => {
    const closeAt = new Date(Date.now() + (3 * 60 * 60 + 15 * 60) * 1000 + 5_000).toISOString();
    expect(formatBattleCountdown(closeAt)).toBe("3h 15m left");
  });

  it("formats days and hours once more than 24 hours remain", () => {
    const closeAt = new Date(Date.now() + 50 * 60 * 60 * 1000 + 5_000).toISOString();
    expect(formatBattleCountdown(closeAt)).toBe("2d 2h left");
  });
});
