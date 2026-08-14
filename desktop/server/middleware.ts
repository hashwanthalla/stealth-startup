import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "./auth";
import { db } from "./db";
import { loadUser, userHasAccess } from "./services/subscription";
import { isBillingEnabled } from "./services/billing-config";
import { MONTHLY_PRICE_USD } from "../shared/types";
import type { User } from "../shared/types";

export interface AuthedRequest extends Request {
  user?: User;
}

export function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const payload = verifyToken(header.slice(7));
    const user = loadUser(db, payload.sub);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    req.user = user;
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
  if (!isBillingEnabled()) {
    next();
    return;
  }

  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const currentUser = loadUser(db, user.id) ?? user;
  req.user = currentUser;

  if (userHasAccess(currentUser)) {
    next();
    return;
  }

  res.status(402).json({
    error: "Subscription required",
    message: `Your free trial has ended. Subscribe for $${MONTHLY_PRICE_USD}/month to continue.`,
    subscriptionStatus: currentUser.subscriptionStatus,
  });
}
