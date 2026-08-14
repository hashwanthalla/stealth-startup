import { Router } from "express";
import Stripe from "stripe";
import { db } from "../db";
import { authMiddleware, type AuthedRequest } from "../middleware";
import { MONTHLY_PRICE_USD } from "../../shared/types";
import { loadUser, mapStripeSubscriptionStatus, userHasAccess } from "../services/subscription";
import { isBillingEnabled } from "../services/billing-config";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;
const appUrl = process.env.APP_URL ?? "http://localhost:5173";

export const billingRoutes = Router();

billingRoutes.post("/webhook", async (req, res) => {
  if (!stripe) {
    res.status(503).json({ error: "Stripe not configured" });
    return;
  }

  const signature = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    res.status(400).json({ error: "Missing webhook signature or secret" });
    return;
  }

  try {
    const event = stripe.webhooks.constructEvent(
      (req as { rawBody?: Buffer }).rawBody ?? Buffer.from(JSON.stringify(req.body)),
      signature,
      webhookSecret
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
      const subscriptionId =
        typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

      if (userId) {
        db.prepare(
          `UPDATE users
           SET subscription_status = 'active',
               stripe_customer_id = COALESCE(?, stripe_customer_id),
               stripe_subscription_id = COALESCE(?, stripe_subscription_id)
           WHERE id = ?`
        ).run(customerId ?? null, subscriptionId ?? null, userId);
      } else if (customerId) {
        db.prepare(
          `UPDATE users
           SET subscription_status = 'active', stripe_subscription_id = COALESCE(?, stripe_subscription_id)
           WHERE stripe_customer_id = ?`
        ).run(subscriptionId ?? null, customerId);
      }
    }

    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const status = mapStripeSubscriptionStatus(subscription.status);
      db.prepare(
        `UPDATE users SET subscription_status = ?, stripe_subscription_id = ? WHERE stripe_customer_id = ?`
      ).run(status, subscription.id, customerId);
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      db.prepare(`UPDATE users SET subscription_status = 'cancelled' WHERE stripe_customer_id = ?`).run(
        subscription.customer as string
      );
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      db.prepare(`UPDATE users SET subscription_status = 'past_due' WHERE stripe_customer_id = ?`).run(customerId);
    }

    res.json({ received: true });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Webhook error",
    });
  }
});

billingRoutes.use(authMiddleware);

billingRoutes.get("/status", (req: AuthedRequest, res) => {
  const user = loadUser(db, req.user!.id);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    user,
    monthlyPriceUsd: MONTHLY_PRICE_USD,
    billingEnabled: isBillingEnabled(),
    stripeConfigured: Boolean(stripe && process.env.STRIPE_PRICE_ID),
    hasAccess: userHasAccess(user),
  });
});

billingRoutes.post("/checkout", async (req: AuthedRequest, res) => {
  if (!stripe) {
    res.status(503).json({
      error: "Stripe is not configured",
      message: "Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID in your environment to enable billing.",
    });
    return;
  }

  const user = req.user!;
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(user.id) as Record<string, unknown>;

  let customerId = row.stripe_customer_id as string | null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    db.prepare("UPDATE users SET stripe_customer_id = ? WHERE id = ?").run(customerId, user.id);
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    res.status(503).json({
      error: "STRIPE_PRICE_ID is not configured",
      message: `Create a $${MONTHLY_PRICE_USD}/month recurring price in Stripe and set STRIPE_PRICE_ID.`,
    });
    return;
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/billing?success=1`,
    cancel_url: `${appUrl}/billing?cancelled=1`,
    metadata: { userId: user.id },
    subscription_data: {
      metadata: { userId: user.id },
    },
  });

  res.json({ url: session.url });
});

billingRoutes.post("/portal", async (req: AuthedRequest, res) => {
  if (!stripe) {
    res.status(503).json({ error: "Stripe is not configured" });
    return;
  }

  const row = db.prepare("SELECT stripe_customer_id FROM users WHERE id = ?").get(req.user!.id) as
    | { stripe_customer_id: string | null }
    | undefined;

  if (!row?.stripe_customer_id) {
    res.status(400).json({ error: "No billing account found. Subscribe first." });
    return;
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: row.stripe_customer_id,
    return_url: `${appUrl}/billing`,
  });

  res.json({ url: session.url });
});

billingRoutes.post("/dev-activate", (req: AuthedRequest, res) => {
  if (process.env.NODE_ENV === "production") {
    res.status(403).json({ error: "Not available in production" });
    return;
  }
  db.prepare("UPDATE users SET subscription_status = 'active' WHERE id = ?").run(req.user!.id);
  res.json({ ok: true });
});
