/** Payments are opt-in until a provider (e.g. Razorpay) is configured. */
export function isBillingEnabled(): boolean {
  if (process.env.BILLING_ENABLED === "false") return false;
  if (process.env.BILLING_ENABLED === "true") {
    return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
  }
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
}
