import type { DatabaseSync } from "node:sqlite";
import type { SubscriptionStatus, User } from "../../shared/types";

export function mapStripeSubscriptionStatus(status: string): SubscriptionStatus {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "cancelled";
    default:
      return "expired";
  }
}

export function expireTrialIfNeeded(db: DatabaseSync, userId: string) {
  const row = db.prepare("SELECT subscription_status, trial_ends_at FROM users WHERE id = ?").get(userId) as
    | { subscription_status: string; trial_ends_at: string }
    | undefined;
  if (!row) return;

  if (row.subscription_status === "trial" && new Date(row.trial_ends_at).getTime() <= Date.now()) {
    db.prepare("UPDATE users SET subscription_status = 'expired' WHERE id = ? AND subscription_status = 'trial'").run(
      userId
    );
  }
}

export function mapUserRow(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    email: row.email as string,
    role: row.role as User["role"],
    trialEndsAt: row.trial_ends_at as string,
    subscriptionStatus: row.subscription_status as SubscriptionStatus,
    createdAt: row.created_at as string,
  };
}

export function userHasAccess(user: User): boolean {
  if (user.role === "admin") return true;
  if (user.subscriptionStatus === "active") return true;
  if (user.subscriptionStatus === "trial" && new Date(user.trialEndsAt).getTime() > Date.now()) return true;
  return false;
}

export function loadUser(db: DatabaseSync, userId: string): User | null {
  expireTrialIfNeeded(db, userId);
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as Record<string, unknown> | undefined;
  if (!row) return null;
  return mapUserRow(row);
}
