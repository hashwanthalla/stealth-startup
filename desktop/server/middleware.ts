import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "./auth";
import { db } from "./db";
import type { User } from "../shared/types";

export interface AuthedRequest extends Request {
  user?: User;
}

function mapUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    email: row.email as string,
    role: row.role as User["role"],
    trialEndsAt: row.trial_ends_at as string,
    subscriptionStatus: row.subscription_status as User["subscriptionStatus"],
    createdAt: row.created_at as string,
  };
}

export function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const payload = verifyToken(header.slice(7));
    const row = db.prepare("SELECT * FROM users WHERE id = ?").get(payload.sub) as
      | Record<string, unknown>
      | undefined;
    if (!row) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    req.user = mapUser(row);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

export function adminMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

export function subscriptionMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  if (user.role === "admin") {
    next();
    return;
  }

  const now = Date.now();
  const trialEnd = new Date(user.trialEndsAt).getTime();
  const hasActiveSub = user.subscriptionStatus === "active";
  const inTrial = trialEnd > now && user.subscriptionStatus === "trial";

  if (hasActiveSub || inTrial) {
    next();
    return;
  }

  res.status(402).json({
    error: "Subscription required",
    message: "Your free trial has ended. Subscribe for $10/week to continue.",
  });
}
