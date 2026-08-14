import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PlusCircle } from "lucide-react";
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
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">My questions</h1>
          <p className="mt-2 text-slate-400">
            Your personal library of problems, starter code, and solutions to visualize.
          </p>
        </div>
        <Link
          to="/questions"
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          <PlusCircle className="h-4 w-4" />
          Manage questions
        </Link>
      </div>

      {error && <p className="text-red-400">{error}</p>}

      {questions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-10 text-center">
          <p className="text-lg text-white">No questions yet</p>
          <p className="mt-2 text-slate-400">Create your first question with starter code and a solution.</p>
          <Link
            to="/questions"
            className="mt-6 inline-flex rounded-xl bg-brand-600 px-5 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Create a question
          </Link>
        </div>
      ) : (
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
                <span className="text-xs text-slate-500">Private</span>
              </div>
              <h2 className="mt-4 text-xl font-semibold text-white">{question.title}</h2>
              <p className="mt-2 line-clamp-3 text-sm text-slate-400">{question.description}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
