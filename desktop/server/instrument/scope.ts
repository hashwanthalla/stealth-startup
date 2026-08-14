export function indentOf(line: string) {
  return line.match(/^\s*/)?.[0] ?? "";
}

export function parseCStyleParams(signature: string): string[] {
  return parseCStyleParamParts(signature).map((part) => part.name);
}

export function parseCStyleParamParts(signature: string): Array<{ name: string; traceable: boolean }> {
  return signature
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const cleaned = part.replace(/\.\.\./g, "").trim();
      const tokens = cleaned.split(/\s+/);
      const name = tokens[tokens.length - 1]?.replace(/\[|\]/g, "") ?? "";
      return { name, traceable: isTraceableDeclaration(cleaned) };
    })
    .filter((part) => Boolean(part.name));
}

export function isTraceableDeclaration(declaration: string): boolean {
  const trimmed = declaration.trim();
  if (!trimmed) return false;
  if (/[\[\*]/.test(trimmed)) return false;
  if (/\b(vector|string|map|set|list|array|slice|chan|interface|struct)\b/i.test(trimmed)) return false;
  if (/&\s*[A-Za-z_]\w*$/.test(trimmed)) return false;
  return /\b(int|long|short|float|double|bool|char|size_t|unsigned|signed|auto|var|byte|rune)\b/i.test(trimmed);
}

export function extractCStyleDeclarations(line: string): string[] {
  const declared: string[] = [];
  const forMatch = line.match(
    /for\s*\(\s*(?:int|long|float|double|char|bool|auto|size_t|unsigned\s+\w+|\w+)\s+([A-Za-z_][\w]*)\s*[=;]/
  );
  if (forMatch) declared.push(forMatch[1]);

  const declMatches = line.matchAll(
    /(?:^|[\s(;])(?:(?:const|static|unsigned|signed)\s+)*(?:int|long|short|float|double|bool|char|size_t|auto|string|vector|string|var|[A-Za-z_][\w]*(?:::\w+)?(?:<[^>]+>)?(?:\s*\*)?(?:\[\])?)\s+([A-Za-z_][\w]*)\s*(?:=|,|;|\[)/g
  );
  for (const match of declMatches) {
    const name = match[1];
    if (!["class", "struct", "enum", "return", "new", "catch", "if", "for", "while", "switch"].includes(name)) {
      declared.push(name);
    }
  }
  return declared;
}

export function isReturnLikeLine(trimmed: string) {
  return /^(return|throw|break|continue|goto)\b/.test(trimmed);
}

export function isSkippableLine(trimmed: string, tracePrefix: string) {
  if (!trimmed || trimmed === "{" || trimmed === "}") return true;
  if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) return true;
  if (trimmed.startsWith("#")) return true;
  if (trimmed.startsWith(tracePrefix)) return true;
  if (trimmed.startsWith("using ") || trimmed.startsWith("import ") || trimmed.startsWith("package ")) return true;
  return false;
}

export class ScopeTracker {
  private braceDepth = 0;
  private methodDepth: number | null = null;
  private methodParams = new Set<string>();
  private blockScopes: Set<string>[] = [];
  private fields = new Set<string>();
  private nonTraceable = new Set<string>();

  constructor(fields: string[] = []) {
    this.fields = new Set(fields);
  }

  enterMethod(params: string[] | Array<{ name: string; traceable: boolean }>) {
    this.methodDepth = this.braceDepth;
    this.methodParams = new Set();
    this.nonTraceable = new Set();

    for (const param of params) {
      if (typeof param === "string") {
        this.methodParams.add(param);
      } else {
        this.methodParams.add(param.name);
        if (!param.traceable) this.nonTraceable.add(param.name);
      }
    }
    this.blockScopes = [new Set()];
  }

  exitMethodIfNeeded(newDepth: number) {
    if (this.methodDepth !== null && newDepth < this.methodDepth) {
      this.methodDepth = null;
      this.methodParams = new Set();
      this.blockScopes = [];
    }
  }

  openBlocks(count: number) {
    for (let i = 0; i < count; i++) this.blockScopes.push(new Set());
  }

  closeBlocks(count: number) {
    for (let i = 0; i < count; i++) {
      if (this.blockScopes.length > 1) this.blockScopes.pop();
    }
  }

  addDeclarations(line: string) {
    if (this.methodDepth === null || this.blockScopes.length === 0) return;
    for (const name of extractCStyleDeclarations(line)) {
      this.blockScopes[this.blockScopes.length - 1].add(name);
      if (!isTraceableDeclaration(line)) {
        this.nonTraceable.add(name);
      }
    }
  }

  activeVariables(isStatic = false): string[] {
    const names = new Set<string>();
    if (!isStatic) {
      for (const field of this.fields) names.add(field);
    }
    for (const param of this.methodParams) names.add(param);
    for (const scope of this.blockScopes) {
      for (const variable of scope) names.add(variable);
    }
    return Array.from(names).filter((name) => !this.nonTraceable.has(name));
  }

  inMethod() {
    return this.methodDepth !== null;
  }

  setDepth(depth: number) {
    this.braceDepth = depth;
  }

  getDepth() {
    return this.braceDepth;
  }

  updateDepth(opens: number, closes: number) {
    this.braceDepth += opens - closes;
    return this.braceDepth;
  }
}
