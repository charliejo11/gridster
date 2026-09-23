// Venue/Creator has no Stripe product of its own. It shares the Plus upgrade.
export function resolveLandingPricingAction(plan, { isLoggedIn = false } = {}) {
  if (!plan) {
    return null;
  }

  if (plan.action === "plus" || plan.popular) {
    return "plus";
  }

  if (plan.action === "free") {
    return isLoggedIn ? "home" : "signup";
  }

  return null;
}
