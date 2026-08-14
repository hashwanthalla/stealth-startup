import { Router } from "express";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { z } from "zod";
import { db } from "../db";
import { signToken } from "../auth";
import { TRIAL_DAYS } from "../../shared/types";
import type { User } from "../../shared/types";
import { createSampleQuestionForUser } from "../services/questions";
import { loadUser, mapUserRow } from "../services/subscription";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authRoutes = Router();

authRoutes.post("/register", (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(parsed.data.email);
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const id = randomUUID();
  const now = new Date();
  const trialEnds = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  db.prepare(
    `INSERT INTO users (id, email, password_hash, role, trial_ends_at, subscription_status, created_at)
     VALUES (?, ?, ?, 'user', ?, 'trial', ?)`
  ).run(
    id,
    parsed.data.email,
    bcrypt.hashSync(parsed.data.password, 10),
    trialEnds.toISOString(),
    now.toISOString()
  );

  createSampleQuestionForUser(db, id);

  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as Record<string, unknown>;
  const user = mapUserRow(row);
  res.json({ token: signToken(user), user });
});

authRoutes.post("/login", (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const row = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(parsed.data.email) as Record<string, unknown> | undefined;

  if (!row || !bcrypt.compareSync(parsed.data.password, row.password_hash as string)) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const user = loadUser(db, row.id as string);
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  res.json({ token: signToken(user), user });
});
