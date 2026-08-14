import { ScopeTracker, indentOf, isReturnLikeLine, isSkippableLine, parseCStyleParams } from "../instrument/scope";

const FUNCTION_PATTERN =
  /^(?:static\s+)?(?:inline\s+)?(?:const\s+)?(?:unsigned\s+|signed\s+)?(?:int|long|short|float|double|bool|char|void|auto|[\w:<>,\s*&]+)\s+([A-Za-z_][\w]*)\s*\(([^)]*)\)\s*\{?\s*$/;

function buildTraceCall(indent: string, lineNumber: number, variables: string[], lang: "c" | "cpp") {
  if (variables.length === 0) {
    return `${indent}codeviz_record(${lineNumber}, 0);`;
  }
  const pairs = variables.flatMap((name) => {
    if (lang === "cpp") {
      return [`"${name}"`, `codeviz_string(std::to_string(${name}).c_str())`];
    }
    return [`"${name}"`, `codeviz_int(${name})`];
  });
  return `${indent}codeviz_record(${lineNumber}, ${variables.length}, ${pairs.join(", ")});`;
}

export function instrumentNative(
  source: string,
  lang: "c" | "cpp"
): { code: string; hasMain: boolean } {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const output: string[] = [];
  const scope = new ScopeTracker();
  let pendingFunction: { name: string; params: string[]; indent: string } | null = null;
  let wrappedMain = false;

  const header =
    lang === "cpp"
      ? `#include "trace_wrap.h"\n#include <string>\n`
      : `#include "trace_wrap.h"\n`;

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const trimmed = line.trim();
    const lineNumber = index + 1;
    const indent = indentOf(line);
    const opens = (line.match(/{/g) ?? []).length;
    const closes = (line.match(/}/g) ?? []).length;

    if (pendingFunction && trimmed.startsWith("{")) {
      output.push(line);
      scope.updateDepth(opens, 0);
      scope.enterMethod(pendingFunction.params);
      if (pendingFunction.name === "main") {
        output.push(`${indent}  codeviz_install();`);
        wrappedMain = true;
      }
      pendingFunction = null;
      continue;
    }

    const fnMatch = trimmed.match(FUNCTION_PATTERN);
    if (fnMatch && !trimmed.endsWith("{")) {
      pendingFunction = { name: fnMatch[1], params: parseCStyleParams(fnMatch[2] ?? ""), indent };
      output.push(line);
      continue;
    }

    if (fnMatch && trimmed.endsWith("{")) {
      output.push(line);
      scope.updateDepth(opens, closes);
      scope.enterMethod(parseCStyleParams(fnMatch[2] ?? ""));
      if (fnMatch[1] === "main") {
        output.push(`${indent}  codeviz_install();`);
        wrappedMain = true;
      }
      continue;
    }

    if (scope.inMethod()) scope.addDeclarations(trimmed);

    const shouldTrace = scope.inMethod() && !isSkippableLine(trimmed, "codeviz_");
    const traceVars = shouldTrace ? scope.activeVariables(true) : [];
    const traceLine = shouldTrace ? buildTraceCall(`${indent}  `, lineNumber, traceVars, lang) : null;

    if (shouldTrace && isReturnLikeLine(trimmed) && traceLine) output.push(traceLine);
    output.push(line);
    if (shouldTrace && !isReturnLikeLine(trimmed) && traceLine) output.push(traceLine);

    if (scope.inMethod() && opens > 0) scope.openBlocks(opens);
    const newDepth = scope.updateDepth(0, closes);
    if (closes > 0) scope.closeBlocks(closes);
    scope.exitMethodIfNeeded(newDepth);
  }

  let instrumented = output.join("\n");
  if (!instrumented.includes("trace_wrap.h")) {
    instrumented = header + instrumented;
  }
  if (wrappedMain && !instrumented.includes("codeviz_emit")) {
    instrumented = instrumented.replace(
      /(int\s+main\s*\([^)]*\)\s*\{[\s\S]*?)(\n\})/,
      `$1\n  codeviz_emit();\n$2`
    );
  }

  return { code: instrumented, hasMain: /int\s+main\s*\(/.test(source) };
}
