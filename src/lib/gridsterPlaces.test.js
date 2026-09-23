import { describe, expect, it } from "vitest";
import { normalizeSlurlInput } from "./gridsterPlaces.js";

describe("normalizeSlurlInput", () => {
  it("percent-encodes spaces in a maps.secondlife.com region name", () => {
    expect(
      normalizeSlurlInput("https://maps.secondlife.com/secondlife/GEL Community 21/167/202/1653")
    ).toBe("https://maps.secondlife.com/secondlife/GEL%20Community%2021/167/202/1653");
  });

  it("percent-encodes spaces in a secondlife:// region name", () => {
    expect(normalizeSlurlInput("secondlife://GEL Community 21/128/128/25")).toBe(
      "secondlife://GEL%20Community%2021/128/128/25"
    );
  });

  it("percent-encodes spaces in a secondlife:///app/teleport SLURL", () => {
    expect(normalizeSlurlInput("secondlife:///app/teleport/GEL Community 21/128/128/25")).toBe(
      "secondlife:///app/teleport/GEL%20Community%2021/128/128/25"
    );
  });

  it("leaves an already-encoded maps URL unchanged", () => {
    const slurl = "https://maps.secondlife.com/secondlife/GEL%20Community%2021/167/202/1653";

    expect(normalizeSlurlInput(slurl)).toBe(slurl);
  });

  it("leaves an already-encoded secondlife:// URL unchanged", () => {
    const slurl = "secondlife://GEL%20Community%2021/128/128/25";

    expect(normalizeSlurlInput(slurl)).toBe(slurl);
  });

  it("extracts a SLURL from a timestamp-prefixed chat paste", () => {
    const pasted = "Monday, July 20, 2026 7:21 PM\nhttps://maps.secondlife.com/secondlife/Ahern/128/128/2";

    expect(normalizeSlurlInput(pasted)).toBe("https://maps.secondlife.com/secondlife/Ahern/128/128/2");
  });

  it("extracts and encodes a spaced region from a timestamp-prefixed chat paste", () => {
    const pasted =
      "[2026/07/20 19:21] User: https://maps.secondlife.com/secondlife/GEL Community 21/167/202/1653 come by";

    expect(normalizeSlurlInput(pasted)).toBe(
      "https://maps.secondlife.com/secondlife/GEL%20Community%2021/167/202/1653"
    );
  });

  it("returns an empty string for blank input", () => {
    expect(normalizeSlurlInput("")).toBe("");
    expect(normalizeSlurlInput("   ")).toBe("");
    expect(normalizeSlurlInput(null)).toBe("");
  });
});
