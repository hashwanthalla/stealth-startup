import { useState } from "react";
import Editor from "@monaco-editor/react";
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_LABELS,
  MONACO_LANGUAGE_MAP,
  type Language,
} from "@shared/types";
import { api } from "../lib/api";

const emptyStarter = Object.fromEntries(
  SUPPORTED_LANGUAGES.map((lang) => [lang, ""])
) as Record<Language, string>;

export function AdminPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [activeLanguage, setActiveLanguage] = useState<Language>("python");
  const [starterCode, setStarterCode] = useState<Record<Language, string>>(emptyStarter);
  const [message, setMessage] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    try {
      const question = await api.createQuestion({
        title,
        description,
        difficulty,
        starterCode,
      });
      setMessage(`Created question: ${question.title}`);
      setTitle("");
      setDescription("");
      setStarterCode(emptyStarter);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to create question");
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-white">Admin · Upload question</h1>
      <p className="mt-2 text-slate-400">
        Add practice questions with starter code for every supported language.
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
          placeholder="Question description"
          rows={4}
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
          required
        />

        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang}
                type="button"
                onClick={() => setActiveLanguage(lang)}
                className={`rounded-full px-4 py-2 text-sm ${
                  activeLanguage === lang
                    ? "bg-brand-600 text-white"
                    : "bg-slate-800 text-slate-300"
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
              value={starterCode[activeLanguage]}
              onChange={(value) =>
                setStarterCode((prev) => ({ ...prev, [activeLanguage]: value ?? "" }))
              }
              options={{ minimap: { enabled: false }, fontSize: 14 }}
            />
          </div>
        </div>

        <button
          type="submit"
          className="rounded-xl bg-brand-600 px-5 py-3 font-medium text-white hover:bg-brand-700"
        >
          Publish question
        </button>

        {message && <p className="text-sm text-slate-300">{message}</p>}
      </form>
    </div>
  );
}
