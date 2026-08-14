import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import type { VisualizationResult, VisualizationStep } from "../../shared/types";
import { instrumentCSharp } from "../csharp-tracer/instrument";

const JSON_MARKER = "__CODEVIZ_JSON__";

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "codeviz-csharp-"));
}

function run(cmd: string, args: string[], cwd?: string) {
  return spawnSync(cmd, args, { cwd, encoding: "utf8", timeout: 12000, maxBuffer: 4 * 1024 * 1024 });
}

function resolve(file: string) {
  const candidates = [
    path.join(__dirname, "..", "csharp-tracer", file),
    path.join(process.cwd(), "server", "csharp-tracer", file),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`${file} not found`);
}

function parse(stdout: string): VisualizationResult {
  const jsonLine = stdout.split("\n").reverse().find((line) => line.includes(JSON_MARKER));
  if (!jsonLine) {
    return { language: "csharp", success: false, steps: [], finalOutput: stdout, error: "Missing tracer output", visualizationLevel: "execution" };
  }
  const payload = JSON.parse(jsonLine.slice(jsonLine.indexOf(JSON_MARKER) + JSON_MARKER.length));
  return {
    language: "csharp",
    success: Boolean(payload.success),
    steps: (payload.steps ?? []) as VisualizationStep[],
    finalOutput: payload.finalOutput ?? "",
    error: payload.error,
    visualizationLevel: "full",
  };
}

export function visualizeCSharp(code: string): VisualizationResult {
  const tmp = makeTempDir();
  try {
    const { code: instrumented } = instrumentCSharp(code);
    fs.copyFileSync(resolve("Trace.cs"), path.join(tmp, "Trace.cs"));
    fs.writeFileSync(path.join(tmp, "Program.cs"), instrumented);
    const compile = run("csc", ["/nologo", "Trace.cs", "Program.cs"], tmp);
    if (compile.status !== 0) {
      return { language: "csharp", success: false, steps: [], finalOutput: "", error: compile.stderr || compile.stdout, visualizationLevel: "full" };
    }
    const exec = run(path.join(tmp, "Program.exe"), [], tmp);
    return parse(exec.stdout ?? "");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
