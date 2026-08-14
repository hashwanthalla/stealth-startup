import { ScopeTracker, indentOf, isReturnLikeLine, isSkippableLine, parseCStyleParamParts } from "../instrument/scope";

const FUNC_PATTERN = /^func\s+(?:\([^)]+\)\s+)?([A-Za-z_][\w]*)\s*\(([^)]*)\)\s*\{/;

function buildTraceCall(indent: string, lineNumber: number, variables: string[]) {
  if (variables.length === 0) return `${indent}traceRecord(${lineNumber})`;
  const pairs = variables.flatMap((name) => [`"${name}"`, name]);
  return `${indent}traceRecord(${lineNumber}, ${pairs.join(", ")})`;
}

export function instrumentGo(source: string): string {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const output: string[] = [];
  const scope = new ScopeTracker();
  let wrappedMain = false;

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const trimmed = line.trim();
    const lineNumber = index + 1;
    const indent = indentOf(line);
    const opens = (line.match(/{/g) ?? []).length;
    const closes = (line.match(/}/g) ?? []).length;

    const fnMatch = trimmed.match(FUNC_PATTERN);
    if (fnMatch) {
      output.push(line);
      scope.updateDepth(opens, closes);
      scope.enterMethod(parseCStyleParamParts(fnMatch[2] ?? ""));
      if (fnMatch[1] === "main") {
        output.push(`${indent}\ttraceInstall()`);
        output.push(`${indent}\tdefer traceEmit()`);
        wrappedMain = true;
      }
      continue;
    }

    if (scope.inMethod()) scope.addDeclarations(trimmed);
    const shouldTrace = scope.inMethod() && !isSkippableLine(trimmed, "trace");
    const traceVars = shouldTrace ? scope.activeVariables(true) : [];
    const traceLine = shouldTrace ? buildTraceCall(`${indent}\t`, lineNumber, traceVars) : null;

    const rewritten = line
      .replace(/fmt\.Println\((.*)\)/g, "traceLog(fmt.Sprint($1))")
      .replace(/fmt\.Printf\((.*)\)/g, "traceLog(fmt.Sprint($1))");

    if (shouldTrace && isReturnLikeLine(trimmed) && traceLine) output.push(traceLine);
    output.push(rewritten);
    if (shouldTrace && !isReturnLikeLine(trimmed) && traceLine) output.push(traceLine);

    if (scope.inMethod() && opens > 0) scope.openBlocks(opens);
    const newDepth = scope.updateDepth(0, closes);
    if (closes > 0) scope.closeBlocks(closes);
    scope.exitMethodIfNeeded(newDepth);
  }

  let instrumented = output.join("\n");
  return instrumented;
}
