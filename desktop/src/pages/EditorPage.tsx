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
  const [editorHeight, setEditorHeight] = useState(480);

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import("monaco-editor") | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const editorContainerRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container) return;

    const updateHeight = () => setEditorHeight(Math.max(container.clientHeight, 280));
    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(container);
    return () => observer.disconnect();
  }, [panelLayout]);

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
    <div className="flex h-full min-h-0 flex-col xl:flex-row">
      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-col border-slate-800 xl:border-r",
          panelLayout === "editor" && "xl:flex-[3]",
          panelLayout === "balanced" && "xl:flex-[1]",
          panelLayout === "visualization" && "xl:flex-[1]"
        )}
      >
        <div className="shrink-0 space-y-4 border-b border-slate-800/80 p-4 xl:p-5">
          <div>
            <Link to="/dashboard" className="text-sm text-slate-400 hover:text-slate-200">
              ← Back to my questions
            </Link>
            <h1 className="mt-2 text-xl font-semibold text-white xl:text-2xl">{question.title}</h1>
            <p className="mt-1 text-sm text-slate-400">{question.description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>{LANGUAGE_LABELS[lang]}</option>
              ))}
            </select>
            <button
              onClick={() => setCode(question.starterCode[language])}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
            >
              Starter
            </button>
            <button
              onClick={() => setCode(question.solutionCode[language] || question.starterCode[language])}
              className="rounded-lg border border-emerald-700/50 px-3 py-2 text-sm text-emerald-300 hover:bg-emerald-950/40"
            >
              Solution
            </button>
            <button
              onClick={visualize}
              disabled={loading}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {loading ? "Running..." : "Visualize code"}
            </button>

            <div className="ml-auto flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-950 p-1">
              {PANEL_LAYOUTS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  title={label}
                  onClick={() => setPanelLayout(id)}
                  className={cn(
                    "rounded-md p-1.5 transition",
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
        </div>

        <div
          ref={editorContainerRef}
          className="min-h-0 flex-1 overflow-hidden border-b border-slate-800/80 xl:border-b-0"
        >
          <Editor
            height={editorHeight}
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
              padding: { top: 12, bottom: 12 },
            }}
          />
        </div>
      </div>

      <div
        className={cn(
          "flex min-h-0 min-w-0 flex-col",
          panelLayout === "editor" && "xl:flex-[1]",
          panelLayout === "balanced" && "xl:flex-[1]",
          panelLayout === "visualization" && "xl:flex-[3]"
        )}
      >
        <div className="shrink-0 border-b border-slate-800/80 p-4 xl:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-white">Visualization</h2>
              <p className="mt-1 text-sm text-slate-400">
                Active line is highlighted in the editor as you step.
              </p>
            </div>
            {result && (
              <div className="flex items-center gap-2 text-sm">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-medium",
                    result.success
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-red-500/15 text-red-300"
                  )}
                >
                  {result.success ? "Success" : "Failed"}
                </span>
                <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-400">
                  {result.visualizationLevel}
                </span>
              </div>
            )}
          </div>
          {error && (
            <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-red-300">Error</p>
              <pre className="viz-scrollbar mt-2 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-xs text-red-200">
                {error}
              </pre>
            </div>
          )}
          {result?.error && (
            <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-red-300">Execution error</p>
              <pre className="viz-scrollbar mt-2 max-h-48 overflow-auto whitespace-pre-wrap font-mono text-xs text-red-200">
                {result.error}
              </pre>
            </div>
          )}
        </div>

        <div className="viz-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 xl:p-5">
          {result ? (
            <VisualizationPlayer
              steps={result.steps}
              currentIndex={stepIndex}
              onIndexChange={setStepIndex}
              highlightLine={highlightLine}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/30 p-10 text-center text-slate-400">
              Click <span className="text-slate-200">Visualize code</span> to run your solution and
              watch each step here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
