import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Question } from "@shared/types";
import { api } from "../lib/api";

export function DashboardPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getQuestions()
      .then(setQuestions)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load questions"));
  }, []);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Practice questions</h1>
        <p className="mt-2 text-slate-400">
          Pick a question, write code in your language, and visualize execution.
        </p>
      </div>

      {error && <p className="text-red-400">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {questions.map((question) => (
          <Link
            key={question.id}
            to={`/editor/${question.id}`}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-brand-600/60 hover:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-brand-600/20 px-3 py-1 text-xs font-medium text-brand-300">
                {question.difficulty}
              </span>
            </div>
            <h2 className="mt-4 text-xl font-semibold text-white">{question.title}</h2>
            <p className="mt-2 text-sm text-slate-400 line-clamp-3">{question.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
