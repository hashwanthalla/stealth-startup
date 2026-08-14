import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import type { VisualizationResult, VisualizationStep } from "../../shared/types";
import { instrumentGo } from "../go-tracer/instrument";

const JSON_MARKER = "__CODEVIZ_JSON__";

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "codeviz-go-"));
}

function run(cmd: string, args: string[], cwd?: string) {
  return spawnSync(cmd, args, { cwd, encoding: "utf8", timeout: 12000, maxBuffer: 4 * 1024 * 1024 });
}

function resolve(file: string) {
  const candidates = [
    path.join(__dirname, "..", "go-tracer", file),
    path.join(process.cwd(), "server", "go-tracer", file),
  ];
  for (const candidate of candidates) if (fs.existsSync(candidate)) return candidate;
  throw new Error(`${file} not found`);
}

function parse(stdout: string): VisualizationResult {
  const jsonLine = stdout.split("\n").reverse().find((line) => line.includes(JSON_MARKER));
  if (!jsonLine) {
    return { language: "go", success: false, steps: [], finalOutput: stdout, error: "Missing tracer output", visualizationLevel: "execution" };
  }
  const payload = JSON.parse(jsonLine.slice(jsonLine.indexOf(JSON_MARKER) + JSON_MARKER.length));
  return {
    language: "go",
    success: Boolean(payload.success),
    steps: (payload.steps ?? []) as VisualizationStep[],
    finalOutput: payload.finalOutput ?? "",
    error: payload.error,
    visualizationLevel: "full",
  };
}

export function visualizeGo(code: string): VisualizationResult {
  const tmp = makeTempDir();
  try {
    const runtime = fs.readFileSync(resolve("trace.go"), "utf8");
    const instrumented = instrumentGo(code);
    fs.writeFileSync(path.join(tmp, "main.go"), `${runtime}\n\n${instrumented}`);
    const exec = run("go", ["run", "main.go"], tmp);
    if (exec.status !== 0 && !String(exec.stdout).includes(JSON_MARKER)) {
      return { language: "go", success: false, steps: [], finalOutput: exec.stdout, error: exec.stderr || exec.stdout, visualizationLevel: "full" };
    }
    return parse(exec.stdout ?? "");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
