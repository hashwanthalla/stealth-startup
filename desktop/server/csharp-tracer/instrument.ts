import { ScopeTracker, indentOf, isReturnLikeLine, isSkippableLine, parseCStyleParams } from "../instrument/scope";

const METHOD_PATTERN =
  /^(?:(?:public|private|protected|internal)\s+)?(?:static\s+)?[\w<>,\[\]\s]+\s+([A-Za-z_][\w]*)\s*\(([^)]*)\)\s*\{?\s*$/;
const FIELD_PATTERN =
  /^\s*(?:private|public|protected|internal)\s+(?:static\s+)?(?:readonly\s+)?[\w<>,\[\]\s]+\s+([A-Za-z_][\w]*)\s*(?:=|;)/;

function extractFields(source: string): string[] {
  const fields: string[] = [];
  for (const line of source.split("\n")) {
    const match = line.match(FIELD_PATTERN);
    if (match && !line.includes("(")) fields.push(match[1]);
  }
  return fields;
}

function buildTraceCall(indent: string, lineNumber: number, variables: string[]) {
  if (variables.length === 0) return `${indent}Codeviz.Trace.Record(${lineNumber});`;
  const pairs = variables.flatMap((name) => [`"${name}"`, name]);
  return `${indent}Codeviz.Trace.Record(${lineNumber}, ${pairs.join(", ")});`;
}

export function instrumentCSharp(source: string): { code: string; className: string } {
  const className = source.match(/class\s+([A-Za-z_][\w]*)/)?.[1] ?? "Program";
  const scope = new ScopeTracker(extractFields(source));
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const output: string[] = [];
  let pendingMethod: { name: string; params: string[]; indent: string } | null = null;
  let mainDepth: number | null = null;
  let tryDepth: number | null = null;
  let braceDepth = 0;

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const trimmed = line.trim();
    const lineNumber = index + 1;
    const indent = indentOf(line);
    const opens = (line.match(/{/g) ?? []).length;
    const closes = (line.match(/}/g) ?? []).length;
    const newDepth = braceDepth + opens - closes;

    if (pendingMethod && trimmed.startsWith("{")) {
      output.push(line);
      braceDepth = newDepth;
      scope.enterMethod(pendingMethod.params);
      if (pendingMethod.name === "Main") {
        mainDepth = braceDepth;
        tryDepth = braceDepth + 1;
        output.push(`${indent}  Codeviz.Trace.Install();`);
        output.push(`${indent}  try {`);
        braceDepth += 1;
      }
      pendingMethod = null;
      continue;
    }

    const methodMatch = trimmed.match(METHOD_PATTERN);
    if (methodMatch && !trimmed.endsWith("{")) {
      pendingMethod = { name: methodMatch[1], params: parseCStyleParams(methodMatch[2] ?? ""), indent };
      output.push(line);
      continue;
    }

    if (methodMatch && trimmed.endsWith("{")) {
      output.push(line);
      braceDepth = newDepth;
      scope.enterMethod(parseCStyleParams(methodMatch[2] ?? ""));
      if (methodMatch[1] === "Main") {
        mainDepth = braceDepth;
        tryDepth = braceDepth + 1;
        output.push(`${indent}  Codeviz.Trace.Install();`);
        output.push(`${indent}  try {`);
        braceDepth += 1;
      }
      continue;
    }

    if (tryDepth !== null && closes > 0 && newDepth === tryDepth - 1 && mainDepth !== null) {
      appendMainFinally(output, indent);
      output.push(`${indent}}`);
      braceDepth = tryDepth - 1;
      mainDepth = null;
      tryDepth = null;
      scope.exitMethodIfNeeded(braceDepth);
      continue;
    }

    if (scope.inMethod()) scope.addDeclarations(trimmed);
    const shouldTrace = scope.inMethod() && !isSkippableLine(trimmed, "Codeviz.Trace.");
    const traceVars = shouldTrace ? scope.activeVariables(true) : [];
    const traceLine = shouldTrace ? buildTraceCall(`${indent}  `, lineNumber, traceVars) : null;

    if (shouldTrace && isReturnLikeLine(trimmed) && traceLine) output.push(traceLine);
    output.push(line);
    if (shouldTrace && !isReturnLikeLine(trimmed) && traceLine) output.push(traceLine);

    if (scope.inMethod() && opens > 0) scope.openBlocks(opens);
    braceDepth = newDepth;
    if (closes > 0) scope.closeBlocks(closes);
    scope.exitMethodIfNeeded(braceDepth);
  }

  let instrumented = output.join("\n");
  if (!instrumented.includes("using Codeviz;")) {
    instrumented = `using Codeviz;\n\n${instrumented}`;
  }
  return { code: instrumented, className };
}

function appendMainFinally(output: string[], indent: string) {
  output.push(`${indent}  } catch (Exception __codevizError) {`);
  output.push(`${indent}    Codeviz.Trace.Fail(__codevizError.ToString());`);
  output.push(`${indent}  } finally {`);
  output.push(`${indent}    Codeviz.Trace.EmitResult();`);
  output.push(`${indent}  }`);
}
