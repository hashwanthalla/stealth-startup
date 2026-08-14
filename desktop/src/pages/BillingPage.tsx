import { useState } from "react";
import { WEEKLY_PRICE_USD } from "@shared/types";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { daysRemaining, formatDate } from "../lib/utils";

export function BillingPage() {
  const { user, refreshUser } = useAuth();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

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

  const devActivate = async () => {
    await api.devActivate();
    await refreshUser();
    setMessage("Subscription activated for local development.");
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-white">Billing</h1>
      <p className="mt-2 text-slate-400">
        Free trial for 7 days, then ${WEEKLY_PRICE_USD} per week.
      </p>

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
              {user?.subscriptionStatus === "trial" && (
                <span className="ml-2 text-sm text-amber-300">
                  ({daysRemaining(user.trialEndsAt)} days left)
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-brand-600/30 bg-brand-600/10 p-5">
          <p className="text-lg font-semibold text-white">${WEEKLY_PRICE_USD} / week</p>
          <p className="mt-1 text-sm text-slate-300">
            Unlimited code visualizations across Java, C++, C, Python, JavaScript, C#, and Go.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={subscribe}
            disabled={loading}
            className="rounded-xl bg-brand-600 px-5 py-3 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            Subscribe with Stripe
          </button>
          <button
            onClick={devActivate}
            className="rounded-xl border border-slate-700 px-5 py-3 text-slate-200 hover:bg-slate-800"
          >
            Dev: activate locally
          </button>
        </div>

        {message && <p className="mt-4 text-sm text-slate-300">{message}</p>}
        <p className="mt-4 text-xs text-slate-500">
          Configure STRIPE_SECRET_KEY and STRIPE_PRICE_ID for live payments. Use Stripe CLI for webhook testing.
        </p>
      </div>
    </div>
  );
}
