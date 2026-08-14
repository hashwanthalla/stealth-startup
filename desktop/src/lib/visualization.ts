import type { VisualizationVariable } from "@shared/types";

const ARRAY_NAME_PRIORITY = ["arr", "array", "data", "nums", "values", "a", "items"];

export function parseArrayValue(value: string): number[] | null {
  const trimmed = value.trim();
  let inner = "";

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    inner = trimmed.slice(1, -1).trim();
  } else if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    inner = trimmed.slice(1, -1).trim();
  } else {
    return null;
  }

  if (!inner) return [];
  if (inner.startsWith("[")) return null;

  const parts = inner.split(",").map((part) => part.trim()).filter(Boolean);
  const numbers = parts.map((part) => {
    const cleaned = part.replace(/^['"]|['"]$/g, "");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : NaN;
  });

  if (numbers.some((n) => Number.isNaN(n))) return null;
  return numbers;
}

export function parseMatrixValue(value: string): number[][] | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith("[[") || !trimmed.endsWith("]]")) return null;

  const rows = trimmed
    .slice(1, -1)
    .split("],")
    .map((row, index, all) => {
      const normalized =
        index < all.length - 1
          ? `${row.trim()}]`
          : row.trim().startsWith("[")
            ? row.trim()
            : `[${row.trim()}`;
      return parseArrayValue(normalized);
    });

  if (rows.some((row) => !row || row.length === 0)) return null;
  const width = rows[0]!.length;
  if (!rows.every((row) => row!.length === width)) return null;
  return rows as number[][];
}

export function parseGraphValue(value: string): Array<{ node: string; edges: string }> | null {
  if (!value.includes("->")) return null;
  const rows = value.split(/\n|,\s*(?=\d)/).filter(Boolean);
  const parsed = rows
    .map((row) => row.match(/(-?\d+)\s*->\s*(\[[^\]]*\])/))
    .filter(Boolean) as RegExpMatchArray[];
  if (parsed.length === 0) return null;
  return parsed.map((match) => ({ node: match[1], edges: match[2] }));
}

export function findBestArrayVariable(variables: VisualizationVariable[]): VisualizationVariable | null {
  let best: VisualizationVariable | null = null;
  let bestScore = -1;

  for (const variable of variables) {
    const array = parseArrayValue(variable.value);
    if (!array || array.length === 0) continue;

    const priorityIndex = ARRAY_NAME_PRIORITY.indexOf(variable.name.toLowerCase());
    const nameBoost = priorityIndex >= 0 ? 1000 - priorityIndex * 10 : 0;
    const score = nameBoost + array.length;

    if (score > bestScore) {
      best = variable;
      bestScore = score;
    }
  }

  return best;
}

export function findBestMatrixVariable(variables: VisualizationVariable[]): VisualizationVariable | null {
  let best: VisualizationVariable | null = null;
  let bestCells = 0;

  for (const variable of variables) {
    const matrix = parseMatrixValue(variable.value);
    if (!matrix) continue;
    const cells = matrix.length * matrix[0]!.length;
    const priorityIndex = ARRAY_NAME_PRIORITY.indexOf(variable.name.toLowerCase());
    const score = cells + (priorityIndex >= 0 ? 100 : 0);
    if (score > bestCells) {
      best = variable;
      bestCells = score;
    }
  }

  return best;
}

export function inferHighlightIndices(variables: VisualizationVariable[]): number[] {
  const byName = new Map(variables.map((variable) => [variable.name, variable.value]));
  const indices = new Set<number>();

  const addIndex = (raw: string | undefined) => {
    if (!raw) return;
    const value = Number(raw);
    if (Number.isFinite(value) && value >= 0) indices.add(value);
  };

  addIndex(byName.get("j"));
  addIndex(byName.get("i"));
  addIndex(byName.get("mid"));
  addIndex(byName.get("left"));
  addIndex(byName.get("right"));
  addIndex(byName.get("low"));
  addIndex(byName.get("high"));
  addIndex(byName.get("x"));
  addIndex(byName.get("y"));
  addIndex(byName.get("row"));
  addIndex(byName.get("col"));

  const jRaw = byName.get("j");
  if (jRaw) {
    const j = Number(jRaw);
    if (Number.isFinite(j)) indices.add(j + 1);
  }

  const xRaw = byName.get("x");
  const yRaw = byName.get("y");
  if (xRaw && yRaw) {
    const x = Number(xRaw);
    const y = Number(yRaw);
    if (Number.isFinite(x)) indices.add(x);
    if (Number.isFinite(y)) indices.add(y);
  }

  return [...indices];
}

export function diffVariableNames(
  current: VisualizationVariable[],
  previous: VisualizationVariable[] | undefined
): Set<string> {
  if (!previous) return new Set(current.map((v) => v.name));
  const prevMap = new Map(previous.map((v) => [v.name, v.value]));
  const changed = new Set<string>();
  for (const variable of current) {
    if (prevMap.get(variable.name) !== variable.value) changed.add(variable.name);
  }
  return changed;
}
