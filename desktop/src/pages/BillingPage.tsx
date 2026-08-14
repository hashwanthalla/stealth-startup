import { useEffect, useState } from "react";
import { MONTHLY_PRICE_USD, TRIAL_DAYS } from "@shared/types";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { isTrialExpired } from "../lib/subscription";
import { daysRemaining, formatDate } from "../lib/utils";

export function BillingPage() {
  const { user, refreshUser } = useAuth();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [stripeConfigured, setStripeConfigured] = useState(false);

  useEffect(() => {
    api.billingStatus().then((status) => setStripeConfigured(status.stripeConfigured));
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "1") {
      refreshUser().then(() => setMessage("Payment successful. Your subscription is now active."));
    }
    if (params.get("cancelled") === "1") {
      setMessage("Checkout was cancelled. You can subscribe anytime.");
    }
  }, [refreshUser]);

  const subscribe = async () => {
    setLoading(true);
    setMessage("");
    try {
      const { url } = await api.createCheckout();
      window.open(url, "_blank");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not start checkout");
    } finally {
      setLoading(false);
    }
  };

  const openPortal = async () => {
    setLoading(true);
    setMessage("");
    try {
      const { url } = await api.createBillingPortal();
      window.open(url, "_blank");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not open billing portal");
    } finally {
      setLoading(false);
    }
  };

  const devActivate = async () => {
    await api.devActivate();
    await refreshUser();
    setMessage("Subscription activated for local development.");
  };

  const trialExpired = user ? isTrialExpired(user) || user.subscriptionStatus === "expired" : false;
  const needsSubscription =
    user &&
    user.role !== "admin" &&
    user.subscriptionStatus !== "active" &&
    (trialExpired || user.subscriptionStatus === "past_due" || user.subscriptionStatus === "cancelled");

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-white">Billing</h1>
      <p className="mt-2 text-slate-400">
        {TRIAL_DAYS}-day free trial, then ${MONTHLY_PRICE_USD}/month for unlimited visualizations.
      </p>

      {needsSubscription && (
        <div className="mt-6 max-w-2xl rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-100">
          Your trial has ended and visualization access is paused. Subscribe for ${MONTHLY_PRICE_USD}/month to
          continue.
        </div>
      )}

      <div className="mt-8 max-w-2xl rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-slate-400">Current status</p>
            <p className="mt-1 text-xl font-semibold capitalize">{user?.subscriptionStatus}</p>
          </div>
          <div>
            <p className="text-sm text-slate-400">Trial ends</p>
            <p className="mt-1 text-xl font-semibold">
              {user ? formatDate(user.trialEndsAt) : "—"}
              {user?.subscriptionStatus === "trial" && !trialExpired && (
                <span className="ml-2 text-sm text-amber-300">
                  ({daysRemaining(user.trialEndsAt)} days left)
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-brand-600/30 bg-brand-600/10 p-5">
          <p className="text-lg font-semibold text-white">${MONTHLY_PRICE_USD} / month</p>
          <p className="mt-1 text-sm text-slate-300">
            Unlimited code visualizations across Java, C++, C, Python, JavaScript, C#, and Go.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {user?.subscriptionStatus === "active" ? (
            <button
              onClick={openPortal}
              disabled={loading || !stripeConfigured}
              className="rounded-xl bg-brand-600 px-5 py-3 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              Manage subscription
            </button>
          ) : (
            <button
              onClick={subscribe}
              disabled={loading || !stripeConfigured}
              className="rounded-xl bg-brand-600 px-5 py-3 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              Subscribe with Stripe — ${MONTHLY_PRICE_USD}/mo
            </button>
          )}
          <button
            onClick={devActivate}
            className="rounded-xl border border-slate-700 px-5 py-3 text-slate-200 hover:bg-slate-800"
          >
            Dev: activate locally
          </button>
        </div>

        {message && <p className="mt-4 text-sm text-slate-300">{message}</p>}
        <p className="mt-4 text-xs text-slate-500">
          {stripeConfigured
            ? "Payments are processed securely by Stripe. After checkout, return here to refresh your status."
            : `Configure STRIPE_SECRET_KEY and a $${MONTHLY_PRICE_USD}/month STRIPE_PRICE_ID for live payments.`}
        </p>
      </div>
    </div>
  );
}
