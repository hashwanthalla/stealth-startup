import jwt from "jsonwebtoken";
import type { User } from "../shared/types";

const JWT_SECRET = process.env.JWT_SECRET ?? "codeviz-dev-secret-change-in-production";

export function signToken(user: User): string {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function verifyToken(token: string): { sub: string; email: string; role: string } {
  return jwt.verify(token, JWT_SECRET) as { sub: string; email: string; role: string };
}
