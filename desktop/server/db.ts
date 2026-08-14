import { DatabaseSync } from "node:sqlite";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { SUPPORTED_LANGUAGES } from "../shared/types";
import { createSampleQuestionForUser } from "./services/questions";

const dataDir = process.env.CODEVIZ_DATA_DIR ?? path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "codeviz.db");
export const db = new DatabaseSync(dbPath);

db.exec("PRAGMA journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    trial_ends_at TEXT NOT NULL,
    subscription_status TEXT NOT NULL DEFAULT 'trial',
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS question_starter_code (
    question_id TEXT NOT NULL,
    language TEXT NOT NULL,
    starter_code TEXT NOT NULL,
    PRIMARY KEY (question_id, language),
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS question_solution_code (
    question_id TEXT NOT NULL,
    language TEXT NOT NULL,
    solution_code TEXT NOT NULL,
    PRIMARY KEY (question_id, language),
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    question_id TEXT,
    language TEXT NOT NULL,
    code TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (question_id) REFERENCES questions(id)
  );
`);

function seedAdminIfNeeded() {
  const admin = db.prepare("SELECT id FROM users WHERE email = ?").get("admin@codeviz.app");
  if (admin) return;

  const id = randomUUID();
  const now = new Date();
  const trialEnds = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

  db.prepare(
    `INSERT INTO users (id, email, password_hash, role, trial_ends_at, subscription_status, created_at)
     VALUES (?, ?, ?, 'admin', ?, 'active', ?)`
  ).run(
    id,
    "admin@codeviz.app",
    bcrypt.hashSync("admin123", 10),
    trialEnds.toISOString(),
    now.toISOString()
  );

  const questionId = createSampleQuestionForUser(db, id);
  void questionId;
}

seedAdminIfNeeded();

function migrateSolutionCodes() {
  const questions = db.prepare("SELECT id FROM questions").all() as Array<{ id: string }>;
  const hasSolution = db.prepare(
    "SELECT 1 FROM question_solution_code WHERE question_id = ? LIMIT 1"
  );
  const starters = db.prepare(
    "SELECT language, starter_code FROM question_starter_code WHERE question_id = ?"
  );
  const insertSolution = db.prepare(
    `INSERT OR IGNORE INTO question_solution_code (question_id, language, solution_code) VALUES (?, ?, ?)`
  );

  for (const question of questions) {
    if (hasSolution.get(question.id)) continue;
    const rows = starters.all(question.id) as Array<{ language: string; starter_code: string }>;
    for (const row of rows) {
      insertSolution.run(question.id, row.language, row.starter_code);
    }
  }
}

migrateSolutionCodes();
