import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import Stripe from "stripe";
import { db } from "../db";
import { authMiddleware, type AuthedRequest } from "../middleware";
import { WEEKLY_PRICE_USD } from "../../shared/types";

const stripeSecret = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecret ? new Stripe(stripeSecret) : null;

export const billingRoutes = Router();

billingRoutes.use(authMiddleware);

billingRoutes.get("/status", (req: AuthedRequest, res) => {
  res.json({
    user: req.user,
    weeklyPriceUsd: WEEKLY_PRICE_USD,
    stripeConfigured: Boolean(stripe),
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
    res.status(503).json({ error: "STRIPE_PRICE_ID is not configured" });
    return;
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: "http://localhost:5173/billing?success=1",
    cancel_url: "http://localhost:5173/billing?cancelled=1",
    subscription_data: {
      trial_period_days: 0,
    },
    metadata: { userId: user.id },
  });

  res.json({ url: session.url });
});

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

    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      const status = subscription.status === "active" ? "active" : subscription.status;
      db.prepare(
        `UPDATE users SET subscription_status = ?, stripe_subscription_id = ? WHERE stripe_customer_id = ?`
      ).run(status, subscription.id, customerId);
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      db.prepare(
        `UPDATE users SET subscription_status = 'cancelled' WHERE stripe_customer_id = ?`
      ).run(subscription.customer as string);
    }

    res.json({ received: true });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Webhook error",
    });
  }
});

billingRoutes.post("/dev-activate", (req: AuthedRequest, res) => {
  if (process.env.NODE_ENV === "production") {
    res.status(403).json({ error: "Not available in production" });
    return;
  }
  db.prepare("UPDATE users SET subscription_status = 'active' WHERE id = ?").run(req.user!.id);
  res.json({ ok: true });
});
