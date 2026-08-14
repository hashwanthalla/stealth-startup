import { Router } from "express";
import { randomUUID } from "crypto";
import { z } from "zod";
import { db } from "../db";
import {
  authMiddleware,
  subscriptionMiddleware,
  type AuthedRequest,
} from "../middleware";
import { SUPPORTED_LANGUAGES } from "../../shared/types";
import {
  visualizeC,
  visualizeCpp,
  visualizeCSharp,
  visualizeGo,
  visualizeJava,
  visualizeJavaScript,
  visualizePython,
} from "../runners";

const visualizeSchema = z.object({
  language: z.enum(SUPPORTED_LANGUAGES),
  code: z.string().min(1),
  questionId: z.string().optional(),
});

export const visualizeRoutes = Router();

visualizeRoutes.use(authMiddleware, subscriptionMiddleware);

visualizeRoutes.post("/", (req: AuthedRequest, res) => {
  const parsed = visualizeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const { language, code, questionId } = parsed.data;

  if (questionId) {
    const owned = db
      .prepare("SELECT id FROM questions WHERE id = ? AND created_by = ?")
      .get(questionId, req.user!.id);
    if (!owned) {
      res.status(403).json({ error: "You can only visualize your own questions" });
      return;
    }
  }

  let result;
  switch (language) {
    case "python":
      result = visualizePython(code);
      break;
    case "javascript":
      result = visualizeJavaScript(code);
      break;
    case "java":
      result = visualizeJava(code);
      break;
    case "cpp":
      result = visualizeCpp(code);
      break;
    case "c":
      result = visualizeC(code);
      break;
    case "csharp":
      result = visualizeCSharp(code);
      break;
    case "go":
      result = visualizeGo(code);
      break;
    default:
      res.status(400).json({ error: "Unsupported language" });
      return;
  }

  db.prepare(
    `INSERT INTO submissions (id, user_id, question_id, language, code, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    randomUUID(),
    req.user!.id,
    questionId ?? null,
    language,
    code,
    new Date().toISOString()
  );

  res.json(result);
});
