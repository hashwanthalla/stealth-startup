import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { db } from "../db";
import {
  authMiddleware,
  adminMiddleware,
  type AuthedRequest,
} from "../middleware";
import { SUPPORTED_LANGUAGES, type Language, type Question } from "../../shared/types";

function mapQuestion(id: string): Question {
  const row = db.prepare("SELECT * FROM questions WHERE id = ?").get(id) as Record<string, unknown>;
  const starters = db
    .prepare("SELECT language, starter_code FROM question_starter_code WHERE question_id = ?")
    .all(id) as Array<{ language: string; starter_code: string }>;

  const starterCode = {} as Record<Language, string>;
  for (const lang of SUPPORTED_LANGUAGES) {
    const found = starters.find((s) => s.language === lang);
    starterCode[lang] = found?.starter_code ?? "";
  }

  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    difficulty: row.difficulty as Question["difficulty"],
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
    starterCode,
  };
}

const createSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  starterCode: z.record(z.enum(SUPPORTED_LANGUAGES), z.string()),
});

export const questionRoutes = Router();

questionRoutes.use(authMiddleware);

questionRoutes.get("/", (req, res) => {
  const rows = db
    .prepare("SELECT id FROM questions ORDER BY created_at DESC")
    .all() as Array<{ id: string }>;
  res.json(rows.map((row) => mapQuestion(row.id)));
});

questionRoutes.get("/:id", (req, res) => {
  const row = db.prepare("SELECT id FROM questions WHERE id = ?").get(req.params.id);
  if (!row) {
    res.status(404).json({ error: "Question not found" });
    return;
  }
  res.json(mapQuestion(req.params.id));
});

questionRoutes.post("/", adminMiddleware, (req: AuthedRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO questions (id, title, description, difficulty, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    parsed.data.title,
    parsed.data.description,
    parsed.data.difficulty,
    req.user!.id,
    now
  );

  const insert = db.prepare(
    `INSERT INTO question_starter_code (question_id, language, starter_code) VALUES (?, ?, ?)`
  );
  for (const lang of SUPPORTED_LANGUAGES) {
    insert.run(id, lang, parsed.data.starterCode[lang] ?? "");
  }

  res.status(201).json(mapQuestion(id));
});

questionRoutes.delete("/:id", adminMiddleware, (req, res) => {
  const id = String(req.params.id);
  db.prepare("DELETE FROM question_starter_code WHERE question_id = ?").run(id);
  db.prepare("DELETE FROM questions WHERE id = ?").run(id);
  res.json({ ok: true });
});
