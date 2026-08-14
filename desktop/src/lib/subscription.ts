import type { User } from "@shared/types";

export function userHasAccess(user: User): boolean {
  if (user.role === "admin") return true;
  if (user.subscriptionStatus === "active") return true;
  if (user.subscriptionStatus === "trial" && new Date(user.trialEndsAt).getTime() > Date.now()) return true;
  return false;
}

export function isTrialExpired(user: User): boolean {
  return user.subscriptionStatus === "trial" && new Date(user.trialEndsAt).getTime() <= Date.now();
}
