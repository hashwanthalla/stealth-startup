import { useEffect, useMemo, useRef, useState } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { Link, useParams } from "react-router-dom";
import { Columns2, PanelLeft, PanelRight } from "lucide-react";
import type { editor } from "monaco-editor";
import {
  LANGUAGE_LABELS,
  MONACO_LANGUAGE_MAP,
  SUPPORTED_LANGUAGES,
  type Language,
  type Question,
  type VisualizationResult,
} from "@shared/types";
import { api } from "../lib/api";
import { VisualizationPlayer } from "../components/VisualizationPlayer";
import { cn } from "../lib/utils";

type PanelLayout = "balanced" | "editor" | "visualization";

const PANEL_LAYOUTS: Array<{ id: PanelLayout; label: string; icon: typeof Columns2 }> = [
  { id: "editor", label: "Focus editor", icon: PanelLeft },
  { id: "balanced", label: "Balanced", icon: Columns2 },
  { id: "visualization", label: "Focus visualization", icon: PanelRight },
];

export function EditorPage() {
  const { id } = useParams();
  const [question, setQuestion] = useState<Question | null>(null);
  const [language, setLanguage] = useState<Language>("python");
  const [code, setCode] = useState("");
  const [result, setResult] = useState<VisualizationResult | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [panelLayout, setPanelLayout] = useState<PanelLayout>("balanced");

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import("monaco-editor") | null>(null);
  const decorationsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!id) return;
    api.getQuestion(id)
      .then((loaded) => {
        setQuestion(loaded);
        setCode(loaded.starterCode[language]);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load question"));
  }, [id]);

  useEffect(() => {
    if (!question) return;
    setCode(question.starterCode[language]);
    setResult(null);
    setStepIndex(0);
  }, [language, question]);

  const highlightLine = useMemo(() => result?.steps[stepIndex]?.line, [result, stepIndex]);

  const handleEditorMount: OnMount = (editorInstance, monaco) => {
    editorRef.current = editorInstance;
    monacoRef.current = monaco;
  };

  useEffect(() => {
    const editorInstance = editorRef.current;
    const monaco = monacoRef.current;
    if (!editorInstance || !monaco) return;

    if (!highlightLine || highlightLine < 1) {
      decorationsRef.current = editorInstance.deltaDecorations(decorationsRef.current, []);
      return;
    }

    decorationsRef.current = editorInstance.deltaDecorations(decorationsRef.current, [
      {
        range: new monaco.Range(highlightLine, 1, highlightLine, 1),
        options: {
          isWholeLine: true,
          className: "execution-line-highlight",
          glyphMarginClassName: "execution-line-glyph",
        },
      },
    ]);
    editorInstance.revealLineInCenter(highlightLine);
  }, [highlightLine, code]);

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

  if (!question && !error) {
    return <div className="p-8 text-slate-400">Loading question...</div>;
  }

  if (!question) {
    return (
      <div className="p-8">
        <p className="text-red-400">{error || "Question not found"}</p>
        <Link to="/dashboard" className="mt-4 inline-block text-brand-400 hover:text-brand-300">
          Back to my questions
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-screen flex-col xl:flex-row">
      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-col border-slate-800 p-6 xl:border-r",
          panelLayout === "editor" && "xl:flex-[3]",
          panelLayout === "balanced" && "xl:flex-[1]",
          panelLayout === "visualization" && "xl:flex-[1]"
        )}
      >
        <div className="mb-4">
          <Link to="/dashboard" className="text-sm text-slate-400 hover:text-slate-200">
            ← Back to my questions
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-white">{question.title}</h1>
          <p className="mt-1 text-sm text-slate-400">{question.description}</p>
        </div>

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
            onClick={() => setCode(question.starterCode[language])}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Load starter
          </button>
          <button
            onClick={() => setCode(question.solutionCode[language] || question.starterCode[language])}
            className="rounded-xl border border-emerald-700/50 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-950/40"
          >
            Load solution
          </button>
          <button
            onClick={visualize}
            disabled={loading}
            className="rounded-xl bg-brand-600 px-5 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {loading ? "Running..." : "Visualize code"}
          </button>

          <div className="ml-auto flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-950 p-1">
            {PANEL_LAYOUTS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                title={label}
                onClick={() => setPanelLayout(id)}
                className={cn(
                  "rounded-lg p-2 transition",
                  panelLayout === id
                    ? "bg-brand-600 text-white"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>

        <div className="min-h-[50vh] flex-1 overflow-hidden rounded-2xl border border-slate-800 xl:min-h-0">
          <Editor
            height="100%"
            language={MONACO_LANGUAGE_MAP[language]}
            theme="vs-dark"
            value={code}
            onChange={(value) => setCode(value ?? "")}
            onMount={handleEditorMount}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              glyphMargin: true,
              lineNumbersMinChars: 3,
            }}
          />
        </div>
      </div>

      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-col overflow-y-auto p-6",
          panelLayout === "editor" && "xl:flex-[1]",
          panelLayout === "balanced" && "xl:flex-[1]",
          panelLayout === "visualization" && "xl:flex-[3]"
        )}
      >
        <h2 className="text-2xl font-semibold text-white">Visualization</h2>
        <p className="mt-2 text-sm text-slate-400">
          Step through execution — the active line is highlighted in the editor.
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
