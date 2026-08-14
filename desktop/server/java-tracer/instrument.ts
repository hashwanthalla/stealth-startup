const CLASS_PATTERN = /public\s+class\s+([A-Za-z_][\w]*)/;
const METHOD_PATTERN =
  /^(?:\s*)(?:(?:public|private|protected)\s+)?(?:static\s+)?[\w<>,\[\]\s]+\s+([A-Za-z_][\w]*)\s*\(([^)]*)\)\s*\{?\s*$/;
const FIELD_PATTERN =
  /^\s*(?:private|public|protected)\s+(?:static\s+)?(?:final\s+)?[\w<>,\[\]\s]+\s+([A-Za-z_][\w]*)\s*(?:=|;)/;
const SKIP_LINE =
  /^\s*(?:package|import|\/\/|\/\*|\*|@|codeviz\.Trace\.|}\s*catch|}\s*finally)/;
const JAVA_TYPE_KEYWORDS = new Set([
  "boolean",
  "byte",
  "char",
  "double",
  "float",
  "int",
  "long",
  "short",
  "void",
  "var",
  "class",
  "interface",
  "enum",
  "new",
  "return",
  "catch",
  "final",
]);

function endsWithCompletedStatement(trimmed: string) {
  const line = trimmed.replace(/\/\/.*$/, "").trim();
  if (!line) return false;
  if (/^\{.*\},?$/.test(line)) return false;
  return line.endsWith(";");
}

function indentOf(line: string) {
  return line.match(/^\s*/)?.[0] ?? "";
}

function parseParams(signature: string): string[] {
  return signature
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const cleaned = part.replace(/\.\.\./g, "").trim();
      return cleaned.split(/\s+/).pop()?.replace(/\[|\]/g, "") ?? "";
    })
    .filter(Boolean);
}

function extractFields(source: string): Set<string> {
  const fields = new Set<string>();
  for (const line of source.split("\n")) {
    const match = line.match(FIELD_PATTERN);
    if (match && !line.includes("(")) {
      fields.add(match[1]);
    }
  }
  return fields;
}

function extractDeclarations(line: string): string[] {
  const declared: string[] = [];

  const forMatch = line.match(
    /for\s*\(\s*(?:final\s+)?[\w<>,\[\]\s]+\s+([A-Za-z_][\w]*)\s*[:=]/
  );
  if (forMatch) declared.push(forMatch[1]);

  const declMatches = line.matchAll(
    /(?:^|[\s(;])(?:final\s+)?(?:int|long|double|float|boolean|char|byte|short|String|Integer|Long|Double|Boolean|var|[A-Za-z_][\w]*(?:<[^>]+>)?(?:\[\])*)\s+([A-Za-z_][\w]*)\s*(?:=|,|;|\[)/g
  );
  for (const match of declMatches) {
    const name = match[1];
    if (!JAVA_TYPE_KEYWORDS.has(name)) {
      declared.push(name);
    }
  }

  return declared;
}

function isReturnLikeLine(trimmed: string) {
  return /^(return|throw|break|continue)\b/.test(trimmed);
}

function isExecutableLine(trimmed: string) {
  if (!trimmed || trimmed === "{" || trimmed === "}") return false;
  if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) return false;
  if (trimmed.startsWith("@") || trimmed.startsWith("import ") || trimmed.startsWith("package ")) return false;
  if (/^(public|private|protected)\s+(?:static\s+)?class\s/.test(trimmed)) return false;
  if (METHOD_PATTERN.test(trimmed)) return false;
  if (trimmed.startsWith("codeviz.Trace.")) return false;
  return true;
}

function activeVariables(
  methodParams: Set<string>,
  blockScopes: Set<string>[],
  fields: Set<string>,
  isStaticMethod: boolean
): string[] {
  const names = new Set<string>();
  if (!isStaticMethod) {
    for (const field of fields) names.add(field);
  }
  for (const param of methodParams) names.add(param);
  for (const scope of blockScopes) {
    for (const variable of scope) names.add(variable);
  }
  return Array.from(names).filter((name) => name !== "args");
}

function buildTraceCall(indent: string, lineNumber: number, variables: string[]) {
  if (variables.length === 0) {
    return `${indent}codeviz.Trace.record(${lineNumber});`;
  }
  const pairs = variables.flatMap((name) => [`"${name}"`, name]);
  return `${indent}codeviz.Trace.record(${lineNumber}, ${pairs.join(", ")});`;
}

function appendMainFinally(output: string[], indent: string) {
  output.push(`${indent}  } catch (Exception __codevizError) {`);
  output.push(`${indent}    codeviz.Trace.fail(__codevizError.toString());`);
  output.push(`${indent}  } finally {`);
  output.push(`${indent}    codeviz.Trace.emitResult();`);
  output.push(`${indent}  }`);
}

export function instrumentJava(source: string): { code: string; className: string } {
  const className = source.match(CLASS_PATTERN)?.[1] ?? "Main";
  const fields = extractFields(source);
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const output: string[] = [];

  let braceDepth = 0;
  let methodDepth: number | null = null;
  let mainDepth: number | null = null;
  let tryDepth: number | null = null;
  let methodParams = new Set<string>();
  let blockScopes: Set<string>[] = [];
  let isStaticMethod = false;
  let pendingMethod: { name: string; params: string[]; indent: string; isStatic: boolean } | null =
    null;

  const beginMethod = (name: string, params: string[], indent: string, isStatic: boolean) => {
    methodDepth = braceDepth;
    methodParams = new Set(params);
    blockScopes = [new Set()];
    isStaticMethod = isStatic;

    if (name === "main") {
      mainDepth = braceDepth;
      tryDepth = braceDepth + 1;
      output.push(`${indent}  codeviz.Trace.install();`);
      output.push(`${indent}  try {`);
      braceDepth += 1;
    }
  };

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
      beginMethod(pendingMethod.name, pendingMethod.params, indent, pendingMethod.isStatic);
      pendingMethod = null;
      continue;
    }

    const methodMatch = trimmed.match(METHOD_PATTERN);
    if (methodMatch && !trimmed.endsWith("{")) {
      pendingMethod = {
        name: methodMatch[1],
        params: parseParams(methodMatch[2] ?? ""),
        indent,
        isStatic: /\bstatic\b/.test(trimmed),
      };
      output.push(line);
      continue;
    }

    if (methodMatch && trimmed.endsWith("{")) {
      output.push(line);
      braceDepth = newDepth;
      beginMethod(methodMatch[1], parseParams(methodMatch[2] ?? ""), indent, /\bstatic\b/.test(trimmed));
      continue;
    }

    if (
      tryDepth !== null &&
      closes > 0 &&
      newDepth === tryDepth - 1 &&
      mainDepth !== null
    ) {
      const closingBrace = "}".repeat(closes);
      const prefix = line.slice(0, line.indexOf(closingBrace));
      if (prefix.trim()) {
        const declared = extractDeclarations(trimmed);
        if (blockScopes.length > 0) {
          for (const name of declared) blockScopes[blockScopes.length - 1].add(name);
        }
        output.push(prefix.trimEnd());
        if (isExecutableLine(trimmed) && !SKIP_LINE.test(trimmed) && endsWithCompletedStatement(trimmed)) {
          output.push(
            buildTraceCall(
              `${indent}  `,
              lineNumber,
              activeVariables(methodParams, blockScopes, fields, isStaticMethod)
            )
          );
        }
      }
      appendMainFinally(output, indent);
      output.push(`${indent}}`);
      braceDepth = tryDepth - 1;
      methodDepth = null;
      mainDepth = null;
      tryDepth = null;
      methodParams = new Set();
      blockScopes = [];
      continue;
    }

    if (methodDepth !== null) {
      const declared = extractDeclarations(trimmed);
      if (blockScopes.length > 0) {
        for (const name of declared) blockScopes[blockScopes.length - 1].add(name);
      }
    }

    const shouldTrace =
      methodDepth !== null &&
      isExecutableLine(trimmed) &&
      !SKIP_LINE.test(trimmed) &&
      endsWithCompletedStatement(trimmed);

    const traceVars = shouldTrace
      ? activeVariables(methodParams, blockScopes, fields, isStaticMethod)
      : [];
    const traceLine = shouldTrace ? buildTraceCall(`${indent}  `, lineNumber, traceVars) : null;

    if (shouldTrace && isReturnLikeLine(trimmed) && traceLine) {
      output.push(traceLine);
    }

    output.push(line);

    if (shouldTrace && !isReturnLikeLine(trimmed) && traceLine) {
      output.push(traceLine);
    }

    if (methodDepth !== null && opens > 0) {
      for (let i = 0; i < opens; i++) {
        blockScopes.push(new Set());
      }
    }

    braceDepth = newDepth;

    if (methodDepth !== null && closes > 0) {
      for (let i = 0; i < closes; i++) {
        if (blockScopes.length > 1) {
          blockScopes.pop();
        }
      }
      if (braceDepth < methodDepth) {
        methodDepth = null;
        methodParams = new Set();
        blockScopes = [];
      }
    }
  }

  let instrumented = output.join("\n");
  if (!instrumented.includes("import codeviz.Trace")) {
    instrumented = instrumented.includes("package ")
      ? instrumented.replace(/(package\s+[^;]+;\s*)/, `$1\nimport codeviz.Trace;\n`)
      : `import codeviz.Trace;\n\n${instrumented}`;
  }

  return { code: instrumented, className };
}
