import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import type { VisualizationResult, VisualizationStep } from "../../shared/types";
import { instrumentNative } from "../native-tracer/instrument";

const JSON_MARKER = "__CODEVIZ_JSON__";
const RUN_TIMEOUT_MS = 12000;

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "codeviz-native-"));
}

function run(command: string, args: string[], cwd?: string) {
  return spawnSync(command, args, { cwd, encoding: "utf8", timeout: RUN_TIMEOUT_MS, maxBuffer: 4 * 1024 * 1024 });
}

function resolveTracerFile(name: string) {
  const candidates = [
    path.join(__dirname, "..", "native-tracer", name),
    path.join(process.cwd(), "server", "native-tracer", name),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`${name} runtime not found`);
}

function parseResult(stdout: string, language: VisualizationResult["language"]): VisualizationResult {
  const markerIndex = stdout.lastIndexOf(JSON_MARKER);
  if (markerIndex === -1) {
    return {
      language,
      success: false,
      steps: [],
      finalOutput: stdout.trim(),
      error: "Tracer did not return JSON output",
      visualizationLevel: "execution",
    };
  }
  const payload = JSON.parse(stdout.slice(markerIndex + JSON_MARKER.length).trim());
  return {
    language,
    success: Boolean(payload.success),
    steps: (payload.steps ?? []) as VisualizationStep[],
    finalOutput: payload.finalOutput ?? "",
    error: payload.error,
    visualizationLevel: "full",
  };
}

export function visualizeC(code: string): VisualizationResult {
  const tmp = makeTempDir();
  try {
    const { code: instrumented } = instrumentNative(code, "c");
    fs.copyFileSync(resolveTracerFile("trace.h"), path.join(tmp, "trace.h"));
    fs.copyFileSync(resolveTracerFile("trace.c"), path.join(tmp, "trace.c"));
    fs.copyFileSync(resolveTracerFile("trace_wrap.h"), path.join(tmp, "trace_wrap.h"));
    fs.writeFileSync(path.join(tmp, "main.c"), instrumented);

    const compileTrace = run("gcc", ["-c", "trace.c", "-o", "trace.o"], tmp);
    const compileMain = run(
      "gcc",
      ["-c", "-include", path.join(tmp, "trace_wrap.h"), "main.c", "-o", "main.o"],
      tmp
    );
    if (compileTrace.status !== 0 || compileMain.status !== 0) {
      return {
        language: "c",
        success: false,
        steps: [],
        finalOutput: "",
        error: compileTrace.stderr || compileMain.stderr || compileTrace.stdout || compileMain.stdout,
        visualizationLevel: "full",
      };
    }
    const link = run("gcc", ["trace.o", "main.o", "-o", "main"], tmp);
    if (link.status !== 0) {
      return { language: "c", success: false, steps: [], finalOutput: "", error: link.stderr || link.stdout, visualizationLevel: "full" };
    }
    const exec = run(path.join(tmp, "main"), [], tmp);
    return parseResult(exec.stdout ?? "", "c");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

export function visualizeCpp(code: string): VisualizationResult {
  const tmp = makeTempDir();
  try {
    const { code: instrumented } = instrumentNative(code, "cpp");
    fs.copyFileSync(resolveTracerFile("trace.h"), path.join(tmp, "trace.h"));
    fs.copyFileSync(resolveTracerFile("trace.c"), path.join(tmp, "trace.c"));
    fs.copyFileSync(resolveTracerFile("trace_wrap.h"), path.join(tmp, "trace_wrap.h"));
    fs.writeFileSync(path.join(tmp, "main.cpp"), instrumented);

    const compileTrace = run("g++", ["-std=c++17", "-c", "trace.c", "-o", "trace.o"], tmp);
    const compileMain = run(
      "g++",
      ["-std=c++17", "-c", "-include", path.join(tmp, "trace_wrap.h"), "main.cpp", "-o", "main.o"],
      tmp
    );
    if (compileTrace.status !== 0 || compileMain.status !== 0) {
      return {
        language: "cpp",
        success: false,
        steps: [],
        finalOutput: "",
        error: compileTrace.stderr || compileMain.stderr || compileTrace.stdout || compileMain.stdout,
        visualizationLevel: "full",
      };
    }
    const link = run("g++", ["-std=c++17", "trace.o", "main.o", "-o", "main"], tmp);
    if (link.status !== 0) {
      return { language: "cpp", success: false, steps: [], finalOutput: "", error: link.stderr || link.stdout, visualizationLevel: "full" };
    }
    const exec = run(path.join(tmp, "main"), [], tmp);
    return parseResult(exec.stdout ?? "", "cpp");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
