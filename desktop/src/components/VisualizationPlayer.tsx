import { diffVariableNames, findBestArrayVariable, parseArrayValue, parseGraphValue } from "@/lib/visualization";
import type { VisualizationStep, VisualizationVariable } from "@shared/types";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";

function ArrayBars({ values, label }: { values: number[]; label: string }) {
  const max = Math.max(...values, 1);
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <p className="mb-3 text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <div className="flex h-40 items-end gap-2">
        {values.map((value, index) => (
          <div key={`${label}-${index}`} className="flex flex-1 flex-col items-center gap-2">
            <div
              className="w-full rounded-lg bg-gradient-to-t from-brand-700 to-brand-500 transition-all duration-300"
              style={{ height: `${Math.max(12, (value / max) * 100)}%` }}
            />
            <span className="text-xs text-slate-400">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GraphView({ variables }: { variables: VisualizationVariable[] }) {
  const adj = variables.find((v) => v.name === "adjList" || v.value.includes("->"));
  const parsed = adj ? parseGraphValue(adj.value) : null;
  if (!parsed) return null;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <p className="mb-3 text-xs uppercase tracking-wide text-slate-500">Graph structure</p>
      <div className="space-y-2">
        {parsed.map((row) => (
          <div key={row.node} className="flex items-center gap-3 rounded-xl bg-slate-900 px-3 py-2 font-mono text-sm">
            <span className="rounded-full bg-brand-600/20 px-2 py-1 text-brand-300">{row.node}</span>
            <span className="text-slate-500">→</span>
            <span className="text-emerald-300">{row.edges}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function VisualizationPlayer({
  steps,
  currentIndex,
  onIndexChange,
  highlightLine,
}: {
  steps: VisualizationStep[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  highlightLine?: number;
}) {
  const [playing, setPlaying] = useState(false);
  const step = steps[currentIndex];
  const previous = steps[currentIndex - 1];

  useEffect(() => {
    if (!playing) return;
    if (currentIndex >= steps.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => onIndexChange(currentIndex + 1), 700);
    return () => window.clearTimeout(timer);
  }, [playing, currentIndex, steps.length, onIndexChange]);

  const changedVars = useMemo(
    () => (step ? diffVariableNames(step.variables, previous?.variables) : new Set<string>()),
    [step, previous]
  );
  const arrayVariable = step ? findBestArrayVariable(step.variables) : null;
  const arrayValues = arrayVariable ? parseArrayValue(arrayVariable.value) : null;

  if (!step) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-slate-400">
        Run your code to generate a step-by-step visualization.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-400">
              Step {currentIndex + 1} of {steps.length}
              {(highlightLine ?? step.line) ? ` · Line ${highlightLine ?? step.line}` : ""}
            </p>
            <p className="mt-1 text-lg font-medium text-white">{step.message}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onIndexChange(0)} className="rounded-lg bg-slate-800 p-2 hover:bg-slate-700">
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={() => onIndexChange(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="rounded-lg bg-slate-800 p-2 hover:bg-slate-700 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPlaying((value) => !value)}
              className="rounded-lg bg-brand-600 p-2 hover:bg-brand-700"
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              onClick={() => onIndexChange(Math.min(steps.length - 1, currentIndex + 1))}
              disabled={currentIndex >= steps.length - 1}
              className="rounded-lg bg-slate-800 p-2 hover:bg-slate-700 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <input
          type="range"
          min={0}
          max={Math.max(steps.length - 1, 0)}
          value={currentIndex}
          onChange={(e) => {
            setPlaying(false);
            onIndexChange(Number(e.target.value));
          }}
          className="w-full"
        />
      </div>

      {arrayValues && <ArrayBars values={arrayValues} label={arrayVariable!.name} />}
      <GraphView variables={step.variables} />

      {step.variables.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {step.variables.map((variable) => (
            <div
              key={variable.name}
              className={`rounded-xl border p-3 ${
                changedVars.has(variable.name)
                  ? "border-amber-500/50 bg-amber-500/10"
                  : "border-slate-800 bg-slate-950/70"
              }`}
            >
              <p className="text-xs uppercase tracking-wide text-slate-500">{variable.name}</p>
              <p className="mt-1 break-all font-mono text-sm text-emerald-300">{variable.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
        <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Program output</p>
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap font-mono text-sm text-slate-200">
          {step.output || "No output yet"}
        </pre>
      </div>
    </div>
  );
}
