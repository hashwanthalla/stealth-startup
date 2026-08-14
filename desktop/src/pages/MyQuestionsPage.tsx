import { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import { Link } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_LABELS,
  MONACO_LANGUAGE_MAP,
  type Language,
  type Question,
} from "@shared/types";
import { api } from "../lib/api";

const emptyCode = Object.fromEntries(SUPPORTED_LANGUAGES.map((lang) => [lang, ""])) as Record<
  Language,
  string
>;

export function MyQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [activeLanguage, setActiveLanguage] = useState<Language>("python");
  const [codeMode, setCodeMode] = useState<"starter" | "solution">("starter");
  const [starterCode, setStarterCode] = useState<Record<Language, string>>(emptyCode);
  const [solutionCode, setSolutionCode] = useState<Record<Language, string>>(emptyCode);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadQuestions = () => {
    api.getQuestions().then(setQuestions).catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to load questions");
    });
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setDifficulty("beginner");
    setStarterCode(emptyCode);
    setSolutionCode(emptyCode);
    setCodeMode("starter");
  };

  const startEdit = (question: Question) => {
    setEditingId(question.id);
    setTitle(question.title);
    setDescription(question.description);
    setDifficulty(question.difficulty);
    setStarterCode(question.starterCode);
    setSolutionCode(question.solutionCode);
    setCodeMode("starter");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");
    const payload = { title, description, difficulty, starterCode, solutionCode };

    try {
      if (editingId) {
        const updated = await api.updateQuestion(editingId, payload);
        setMessage(`Updated "${updated.title}"`);
      } else {
        const created = await api.createQuestion(payload);
        setMessage(`Created "${created.title}"`);
      }
      resetForm();
      loadQuestions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save question");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this question?")) return;
    try {
      await api.deleteQuestion(id);
      if (editingId === id) resetForm();
      loadQuestions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete question");
    }
  };

  const currentCode = codeMode === "starter" ? starterCode : solutionCode;
  const setCurrentCode = (lang: Language, value: string) => {
    if (codeMode === "starter") {
      setStarterCode((prev) => ({ ...prev, [lang]: value }));
    } else {
      setSolutionCode((prev) => ({ ...prev, [lang]: value }));
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-white">My questions</h1>
      <p className="mt-2 text-slate-400">
        Upload your own problems with starter code and reference solutions, then visualize them in any language.
      </p>

      <form onSubmit={submit} className="mt-8 max-w-5xl space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Question title"
            className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
            required
          />
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
            className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
          >
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the problem, input/output format, and what learners should implement"
          rows={4}
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
          required
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCodeMode("starter")}
            className={`rounded-full px-4 py-2 text-sm ${
              codeMode === "starter" ? "bg-brand-600 text-white" : "bg-slate-800 text-slate-300"
            }`}
          >
            Starter code
          </button>
          <button
            type="button"
            onClick={() => setCodeMode("solution")}
            className={`rounded-full px-4 py-2 text-sm ${
              codeMode === "solution" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-300"
            }`}
          >
            Solution code
          </button>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setActiveLanguage(lang)}
              className={`rounded-full px-4 py-2 text-sm ${
                activeLanguage === lang ? "bg-slate-700 text-white" : "bg-slate-800 text-slate-300"
              }`}
            >
              {LANGUAGE_LABELS[lang]}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-800">
          <Editor
            height="320px"
            language={MONACO_LANGUAGE_MAP[activeLanguage]}
            theme="vs-dark"
            value={currentCode[activeLanguage]}
            onChange={(value) => setCurrentCode(activeLanguage, value ?? "")}
            options={{ minimap: { enabled: false }, fontSize: 14 }}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            className="rounded-xl bg-brand-600 px-5 py-3 font-medium text-white hover:bg-brand-700"
          >
            {editingId ? "Save changes" : "Create question"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-slate-700 px-5 py-3 text-slate-200 hover:bg-slate-800"
            >
              Cancel edit
            </button>
          )}
        </div>

        {message && <p className="text-sm text-emerald-300">{message}</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>

      <div className="mt-12">
        <h2 className="text-xl font-semibold text-white">Your library</h2>
        <div className="mt-4 space-y-3">
          {questions.map((question) => (
            <div
              key={question.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-4"
            >
              <div>
                <p className="font-medium text-white">{question.title}</p>
                <p className="text-sm text-slate-400">{question.difficulty}</p>
              </div>
              <div className="flex gap-2">
                <Link
                  to={`/editor/${question.id}`}
                  className="rounded-lg bg-brand-600 px-3 py-2 text-sm text-white hover:bg-brand-700"
                >
                  Visualize
                </Link>
                <button
                  onClick={() => startEdit(question)}
                  className="rounded-lg bg-slate-800 p-2 text-slate-200 hover:bg-slate-700"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => remove(question.id)}
                  className="rounded-lg bg-slate-800 p-2 text-red-300 hover:bg-slate-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
