import { randomUUID } from "crypto";
import type { DatabaseSync } from "node:sqlite";
import { SUPPORTED_LANGUAGES, type Language } from "../../shared/types";
import { SAMPLE_SOLUTIONS, SAMPLE_STARTERS } from "./sampleQuestion";

export function createQuestionForUser(
  db: DatabaseSync,
  userId: string,
  payload: {
    title: string;
    description: string;
    difficulty: "beginner" | "intermediate" | "advanced";
    starterCode: Record<Language, string>;
    solutionCode: Record<Language, string>;
  }
) {
  const id = randomUUID();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO questions (id, title, description, difficulty, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, payload.title, payload.description, payload.difficulty, userId, now);

  const insertStarter = db.prepare(
    `INSERT INTO question_starter_code (question_id, language, starter_code) VALUES (?, ?, ?)`
  );
  const insertSolution = db.prepare(
    `INSERT INTO question_solution_code (question_id, language, solution_code) VALUES (?, ?, ?)`
  );

  for (const lang of SUPPORTED_LANGUAGES) {
    insertStarter.run(id, lang, payload.starterCode[lang] ?? "");
    insertSolution.run(id, lang, payload.solutionCode[lang] ?? "");
  }

  return id;
}

export function createSampleQuestionForUser(db: DatabaseSync, userId: string) {
  return createQuestionForUser(db, userId, {
    title: "Bubble Sort",
    description: "Implement bubble sort and visualize how elements swap until the array is sorted.",
    difficulty: "beginner",
    starterCode: SAMPLE_STARTERS,
    solutionCode: SAMPLE_SOLUTIONS,
  });
}
