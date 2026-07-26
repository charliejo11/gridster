import Stripe from "stripe";

export function createStripeClient(env) {
  if (!env.STRIPE_SECRET_KEY) {
    return null;
  }

  return new Stripe(env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  });
}
