import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { db } from "../db";
import { authMiddleware, type AuthedRequest } from "../middleware";
import { SUPPORTED_LANGUAGES, type Language, type Question } from "../../shared/types";
import { createQuestionForUser } from "../services/questions";

function mapQuestion(id: string): Question | null {
  const row = db.prepare("SELECT * FROM questions WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  if (!row) return null;

  const starters = db
    .prepare("SELECT language, starter_code FROM question_starter_code WHERE question_id = ?")
    .all(id) as Array<{ language: string; starter_code: string }>;
  const solutions = db
    .prepare("SELECT language, solution_code FROM question_solution_code WHERE question_id = ?")
    .all(id) as Array<{ language: string; solution_code: string }>;

  const starterCode = {} as Record<Language, string>;
  const solutionCode = {} as Record<Language, string>;
  for (const lang of SUPPORTED_LANGUAGES) {
    starterCode[lang] = starters.find((s) => s.language === lang)?.starter_code ?? "";
    solutionCode[lang] = solutions.find((s) => s.language === lang)?.solution_code ?? "";
  }

  return {
    id: row.id as string,
    title: row.title as string,
    description: row.description as string,
    difficulty: row.difficulty as Question["difficulty"],
    createdBy: row.created_by as string,
    createdAt: row.created_at as string,
    starterCode,
    solutionCode,
  };
}

function isOwner(questionId: string, userId: string) {
  const row = db.prepare("SELECT created_by FROM questions WHERE id = ?").get(questionId) as
    | { created_by: string }
    | undefined;
  return row?.created_by === userId;
}

const questionBodySchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  starterCode: z.record(z.enum(SUPPORTED_LANGUAGES), z.string()),
  solutionCode: z.record(z.enum(SUPPORTED_LANGUAGES), z.string()),
});

function validationErrorMessage(error: z.ZodError) {
  return error.issues
    .map((issue) => {
      const path = issue.path.join(".");
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join("; ");
}

function normalizeCodeRecord(code: Partial<Record<Language, string>>): Record<Language, string> {
  const normalized = {} as Record<Language, string>;
  for (const lang of SUPPORTED_LANGUAGES) {
    normalized[lang] = code[lang] ?? "";
  }
  return normalized;
}

function saveQuestionCodes(
  questionId: string,
  starterCode: Record<Language, string>,
  solutionCode: Record<Language, string>
) {
  db.prepare("DELETE FROM question_starter_code WHERE question_id = ?").run(questionId);
  db.prepare("DELETE FROM question_solution_code WHERE question_id = ?").run(questionId);

  const insertStarter = db.prepare(
    `INSERT INTO question_starter_code (question_id, language, starter_code) VALUES (?, ?, ?)`
  );
  const insertSolution = db.prepare(
    `INSERT INTO question_solution_code (question_id, language, solution_code) VALUES (?, ?, ?)`
  );
  for (const lang of SUPPORTED_LANGUAGES) {
    insertStarter.run(questionId, lang, starterCode[lang] ?? "");
    insertSolution.run(questionId, lang, solutionCode[lang] ?? "");
  }
}

export const questionRoutes = Router();

questionRoutes.use(authMiddleware);

questionRoutes.get("/", (req: AuthedRequest, res) => {
  const rows = db
    .prepare("SELECT id FROM questions WHERE created_by = ? ORDER BY created_at DESC")
    .all(req.user!.id) as Array<{ id: string }>;
  res.json(rows.map((row) => mapQuestion(row.id)).filter(Boolean));
});

questionRoutes.get("/:id", (req: AuthedRequest, res) => {
  if (!isOwner(String(req.params.id), req.user!.id)) {
    res.status(404).json({ error: "Question not found" });
    return;
  }
  const question = mapQuestion(String(req.params.id));
  if (!question) {
    res.status(404).json({ error: "Question not found" });
    return;
  }
  res.json(question);
});

questionRoutes.post("/", (req: AuthedRequest, res) => {
  const parsed = questionBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: validationErrorMessage(parsed.error) });
    return;
  }

  const id = createQuestionForUser(db, req.user!.id, {
    ...parsed.data,
    starterCode: normalizeCodeRecord(parsed.data.starterCode),
    solutionCode: normalizeCodeRecord(parsed.data.solutionCode),
  });
  res.status(201).json(mapQuestion(id));
});

questionRoutes.put("/:id", (req: AuthedRequest, res) => {
  const questionId = String(req.params.id);
  if (!isOwner(questionId, req.user!.id)) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  const parsed = questionBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: validationErrorMessage(parsed.error) });
    return;
  }

  db.prepare(
    `UPDATE questions SET title = ?, description = ?, difficulty = ? WHERE id = ? AND created_by = ?`
  ).run(
    parsed.data.title,
    parsed.data.description,
    parsed.data.difficulty,
    questionId,
    req.user!.id
  );

  saveQuestionCodes(
    questionId,
    normalizeCodeRecord(parsed.data.starterCode),
    normalizeCodeRecord(parsed.data.solutionCode)
  );
  res.json(mapQuestion(questionId));
});

questionRoutes.delete("/:id", (req: AuthedRequest, res) => {
  const questionId = String(req.params.id);
  if (!isOwner(questionId, req.user!.id)) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  db.prepare("DELETE FROM question_solution_code WHERE question_id = ?").run(questionId);
  db.prepare("DELETE FROM question_starter_code WHERE question_id = ?").run(questionId);
  db.prepare("DELETE FROM questions WHERE id = ? AND created_by = ?").run(questionId, req.user!.id);
  res.json({ ok: true });
});
