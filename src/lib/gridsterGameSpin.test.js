import { describe, expect, it } from "vitest";
import { computeWeightedOdds } from "./gridsterGameSpin.js";

describe("computeWeightedOdds", () => {
  it("is purely a display helper - odds always sum to 100%", () => {
    const rewards = [{ weight: 1 }, { weight: 2 }, { weight: 7 }];
    const odds = computeWeightedOdds(rewards);

    const total = odds.reduce((sum, reward) => sum + reward.oddsPercent, 0);
    expect(total).toBeCloseTo(100);
  });

  it("splits evenly across equal weights", () => {
    const odds = computeWeightedOdds([{ weight: 1 }, { weight: 1 }]);
    expect(odds[0].oddsPercent).toBeCloseTo(50);
    expect(odds[1].oddsPercent).toBeCloseTo(50);
  });

  it("gives every reward 0% instead of dividing by zero when all weights are zero", () => {
    const odds = computeWeightedOdds([{ weight: 0 }, { weight: 0 }]);
    expect(odds.every((reward) => reward.oddsPercent === 0)).toBe(true);
  });

  it("handles an empty list without throwing", () => {
    expect(computeWeightedOdds([])).toEqual([]);
    expect(computeWeightedOdds(undefined)).toEqual([]);
  });

  it("preserves the original reward fields alongside the computed odds", () => {
    const odds = computeWeightedOdds([{ weight: 1, label: "Bling Bits" }]);
    expect(odds[0].label).toBe("Bling Bits");
  });
});
