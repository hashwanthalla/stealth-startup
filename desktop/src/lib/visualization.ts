import type { VisualizationVariable } from "@shared/types";

export function parseArrayValue(value: string): number[] | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return null;
  const inner = trimmed.slice(1, -1).trim();
  if (!inner) return [];
  const parts = inner.split(",").map((part) => part.trim());
  if (parts.some((part) => Number.isNaN(Number(part)))) return null;
  return parts.map(Number);
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
  let bestLength = 0;
  for (const variable of variables) {
    const array = parseArrayValue(variable.value);
    if (array && array.length > bestLength) {
      best = variable;
      bestLength = array.length;
    }
  }
  return best;
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
