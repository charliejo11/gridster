import { describe, expect, it } from "vitest";
import { resolveLandingPricingAction } from "./landingPricing.js";

const freePlan = { title: "Free", action: "free", button: "Start Free" };
const plusPlan = { title: "Plus", action: "plus", popular: true, button: "Go Plus" };
const venuePlan = { title: "Venue / Creator", action: "plus", button: "Build Your Hub" };

describe("landing pricing CTAs", () => {
  it("sends signed-out visitors from Free into sign-up", () => {
    expect(resolveLandingPricingAction(freePlan, { isLoggedIn: false })).toBe("signup");
  });

  it("sends signed-in visitors from Free into Home", () => {
    expect(resolveLandingPricingAction(freePlan, { isLoggedIn: true })).toBe("home");
  });

  it("opens the Plus upgrade for Go Plus and Venue / Creator", () => {
    expect(resolveLandingPricingAction(plusPlan)).toBe("plus");
    expect(resolveLandingPricingAction(venuePlan)).toBe("plus");
  });

  it("leaves plans without an action alone", () => {
    expect(resolveLandingPricingAction({ title: "Later" })).toBeNull();
    expect(resolveLandingPricingAction(null)).toBeNull();
  });
});
