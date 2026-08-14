import {
  diffVariableNames,
  findBestArrayVariable,
  findBestMatrixVariable,
  findBestTreeVariable,
  getActiveTreeNodeVal,
  inferHighlightIndices,
  parseArrayValue,
  parseGraphValue,
  parseMatrixValue,
  type TreeNodeData,
} from "@/lib/visualization";
import { cn } from "@/lib/utils";
import type { VisualizationStep, VisualizationVariable } from "@shared/types";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";

function TreeNodeView({
  node,
  highlightVal,
}: {
  node: TreeNodeData;
  highlightVal?: number;
}) {
  const active = highlightVal === node.val;
  const hasChildren = Boolean(node.left || node.right);

  return (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full border-2 font-mono text-sm font-semibold tabular-nums",
          active
            ? "border-amber-400 bg-amber-500/20 text-amber-100 shadow-[0_0_14px_rgba(251,191,36,0.35)]"
            : "border-brand-500/70 bg-slate-900 text-slate-100"
        )}
      >
        {node.val}
      </div>
      {hasChildren ? (
        <div className="relative mt-3 flex min-w-[8rem] justify-center gap-10 pt-3">
          <div className="pointer-events-none absolute left-1/2 top-0 h-3 w-px -translate-x-1/2 bg-slate-600" />
          {node.left ? (
            <div className="relative flex flex-col items-center">
              <div className="pointer-events-none absolute -top-3 left-1/2 h-3 w-12 -translate-x-1/2 border-l border-t border-slate-600" />
              <TreeNodeView node={node.left} highlightVal={highlightVal} />
            </div>
          ) : (
            <div className="w-10" />
          )}
          {node.right ? (
            <div className="relative flex flex-col items-center">
              <div className="pointer-events-none absolute -top-3 right-1/2 h-3 w-12 translate-x-1/2 border-r border-t border-slate-600" />
              <TreeNodeView node={node.right} highlightVal={highlightVal} />
            </div>
          ) : (
            <div className="w-10" />
          )}
        </div>
      ) : null}
    </div>
  );
}

function TreeView({
  data,
  label,
  highlightVal,
}: {
  data: TreeNodeData;
  label: string;
  highlightVal?: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
        {highlightVal !== undefined ? (
          <p className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs text-amber-300">
            Visiting node {highlightVal}
          </p>
        ) : null}
      </div>
      <div className="viz-scrollbar overflow-x-auto pb-2">
        <div className="flex min-w-min justify-center px-4 py-2">
          <TreeNodeView node={data} highlightVal={highlightVal} />
        </div>
      </div>
    </div>
  );
}

function MatrixGrid({
  values,
  label,
  activeRow,
  activeCol,
}: {
  values: number[][];
  label: string;
  activeRow?: number;
  activeCol?: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <div className="viz-scrollbar overflow-x-auto">
        <div
          className="inline-grid gap-1.5"
          style={{ gridTemplateColumns: `repeat(${values[0]?.length ?? 1}, minmax(2.5rem, 1fr))` }}
        >
          {values.map((row, rowIndex) =>
            row.map((value, colIndex) => {
              const active =
                activeRow === rowIndex &&
                activeCol === colIndex &&
                activeRow !== undefined &&
                activeCol !== undefined;
              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={cn(
                    "flex min-w-10 items-center justify-center rounded-lg border px-2 py-2 font-mono text-sm tabular-nums",
                    active
                      ? "border-amber-400/60 bg-amber-500/15 text-amber-100"
                      : value === 0
                        ? "border-slate-800 bg-slate-900/80 text-slate-600"
                        : "border-slate-700 bg-slate-900 text-slate-200"
                  )}
                >
                  {value}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function ArrayBars({
  values,
  label,
  highlights = [],
}: {
  values: number[];
  label: string;
  highlights?: number[];
}) {
  const max = Math.max(...values, 1);
  const highlightSet = new Set(highlights);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className="font-mono text-xs text-slate-500">[{values.join(", ")}]</p>
      </div>
      <div className="viz-scrollbar overflow-x-auto pb-1">
        <div className="flex h-44 min-w-min items-end gap-2 px-1">
          {values.map((value, index) => (
            <div key={`${label}-${index}`} className="flex w-11 shrink-0 flex-col items-center gap-1">
              <div className="flex h-36 w-full items-end justify-center">
                <div
                  className={cn(
                    "w-full max-w-[2.25rem] rounded-md transition-all duration-300",
                    highlightSet.has(index)
                      ? "bg-gradient-to-t from-amber-600 to-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.35)]"
                      : "bg-gradient-to-t from-brand-700 to-brand-500"
                  )}
                  style={{
                    height: `${Math.max(10, (value / max) * 100)}%`,
                    minHeight: "10px",
                  }}
                />
              </div>
              <span className="text-xs font-medium tabular-nums text-slate-300">{value}</span>
              <span className="text-[10px] tabular-nums text-slate-600">[{index}]</span>
            </div>
          ))}
        </div>
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
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">Graph structure</p>
      <div className="space-y-2">
        {parsed.map((row) => (
          <div
            key={row.node}
            className="flex items-center gap-3 rounded-xl bg-slate-900 px-3 py-2 font-mono text-sm"
          >
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
  const matrixVariable = step ? findBestMatrixVariable(step.variables) : null;
  const matrixValues = matrixVariable ? parseMatrixValue(matrixVariable.value) : null;
  const treeResult = step ? findBestTreeVariable(step.variables) : null;
  const highlightIndices = useMemo(() => {
    if (!step) return [];
    const fromStep = step.highlights ?? [];
    const inferred = inferHighlightIndices(step.variables);
    return [...new Set([...fromStep, ...inferred])];
  }, [step]);
  const activeTreeNodeVal = step ? getActiveTreeNodeVal(step.variables) : undefined;
  const matrixPosition = useMemo(() => {
    if (!step) return { row: undefined, col: undefined };
    const byName = new Map(step.variables.map((variable) => [variable.name, variable.value]));
    const row = Number(byName.get("x") ?? byName.get("row"));
    const col = Number(byName.get("y") ?? byName.get("col"));
    return {
      row: Number.isFinite(row) ? row : undefined,
      col: Number.isFinite(col) ? col : undefined,
    };
  }, [step]);

  if (!step) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center text-slate-400">
        Run your code to generate a step-by-step visualization.
      </div>
    );
  }

  const activeLine = highlightLine ?? step.line;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
              <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-300">
                Step {currentIndex + 1} / {steps.length}
              </span>
              {activeLine ? (
                <span className="rounded-full bg-brand-600/20 px-2.5 py-0.5 text-xs font-medium text-brand-300">
                  Line {activeLine}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-base font-medium leading-snug text-white">{step.message}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => onIndexChange(0)}
              className="rounded-lg bg-slate-800 p-2 text-slate-300 hover:bg-slate-700"
              title="Reset"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onIndexChange(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="rounded-lg bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
              title="Previous step"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPlaying((value) => !value)}
              className="rounded-lg bg-brand-600 p-2 text-white hover:bg-brand-700"
              title={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => onIndexChange(Math.min(steps.length - 1, currentIndex + 1))}
              disabled={currentIndex >= steps.length - 1}
              className="rounded-lg bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
              title="Next step"
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
          className="viz-range mt-4 w-full"
        />
      </div>

      {treeResult ? (
        <TreeView
          data={treeResult.data}
          label={treeResult.variable.name}
          highlightVal={activeTreeNodeVal}
        />
      ) : null}

      {matrixValues && matrixValues.length > 0 ? (
        <MatrixGrid
          values={matrixValues}
          label={matrixVariable!.name}
          activeRow={matrixPosition.row}
          activeCol={matrixPosition.col}
        />
      ) : null}

      {arrayValues && arrayValues.length > 0 ? (
        <ArrayBars values={arrayValues} label={arrayVariable!.name} highlights={highlightIndices} />
      ) : null}

      <GraphView variables={step.variables} />

      {step.variables.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-400">Variables</p>
          <div className="viz-scrollbar grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2">
            {step.variables.map((variable) => (
              <div
                key={variable.name}
                className={cn(
                  "rounded-xl border p-3",
                  changedVars.has(variable.name)
                    ? "border-amber-500/50 bg-amber-500/10"
                    : "border-slate-800 bg-slate-900/80"
                )}
              >
                <p className="text-xs font-medium text-slate-400">{variable.name}</p>
                <p className="mt-1 break-all font-mono text-sm text-emerald-300">{variable.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Program output</p>
        <pre className="viz-scrollbar max-h-36 overflow-auto whitespace-pre-wrap font-mono text-sm text-slate-200">
          {step.output || "No output yet"}
        </pre>
      </div>
    </div>
  );
}
