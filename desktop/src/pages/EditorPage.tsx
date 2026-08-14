import { useEffect, useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import { useParams } from "react-router-dom";
import {
  LANGUAGE_LABELS,
  MONACO_LANGUAGE_MAP,
  SUPPORTED_LANGUAGES,
  type Language,
  type VisualizationResult,
} from "@shared/types";
import { api } from "../lib/api";
import { VisualizationPlayer } from "../components/VisualizationPlayer";

export function EditorPage() {
  const { id } = useParams();
  const [language, setLanguage] = useState<Language>("python");
  const [code, setCode] = useState("");
  const [result, setResult] = useState<VisualizationResult | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    api.getQuestion(id).then((question) => setCode(question.starterCode[language]));
  }, [language, id]);

  const highlightLine = useMemo(
    () => result?.steps[stepIndex]?.line,
    [result, stepIndex]
  );

  const visualize = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.visualize({ language, code, questionId: id });
      setResult(response);
      setStepIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Visualization failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid h-full min-h-screen grid-cols-1 xl:grid-cols-2">
      <div className="border-r border-slate-800 p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>{LANGUAGE_LABELS[lang]}</option>
            ))}
          </select>
          <button
            onClick={visualize}
            disabled={loading}
            className="rounded-xl bg-brand-600 px-5 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {loading ? "Running..." : "Visualize code"}
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-800">
          <Editor
            height="70vh"
            language={MONACO_LANGUAGE_MAP[language]}
            theme="vs-dark"
            value={code}
            onChange={(value) => setCode(value ?? "")}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              lineNumbers: "on",
            }}
          />
        </div>
      </div>

      <div className="p-6">
        <h2 className="text-2xl font-semibold text-white">Visualization</h2>
        <p className="mt-2 text-sm text-slate-400">
          All supported languages now include step-by-step variable tracing, array bars, and graph snapshots where detected.
        </p>

        {error && <p className="mt-4 text-red-400">{error}</p>}

        {result && (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm">
              <p>
                Status:{" "}
                <span className={result.success ? "text-emerald-400" : "text-red-400"}>
                  {result.success ? "Success" : "Failed"}
                </span>
              </p>
              <p className="mt-1 text-slate-400">Mode: {result.visualizationLevel}</p>
              {result.error && <p className="mt-2 text-red-300">{result.error}</p>}
            </div>

            <VisualizationPlayer
              steps={result.steps}
              currentIndex={stepIndex}
              onIndexChange={setStepIndex}
              highlightLine={highlightLine}
            />
          </div>
        )}
      </div>
    </div>
  );
}
