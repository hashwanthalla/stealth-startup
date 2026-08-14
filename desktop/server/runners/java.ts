import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import type { VisualizationResult, VisualizationStep } from "../../shared/types";
import { instrumentJava } from "../java-tracer/instrument";
import { resolveTracerFile } from "../services/tracer-paths";

const RUN_TIMEOUT_MS = 12000;
const JSON_MARKER = "__CODEVIZ_JSON__";

function resolveTraceRuntime(): string {
  return resolveTracerFile("java-tracer", "Trace.java");
}

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "codeviz-java-"));
}

function runCommand(command: string, args: string[], cwd?: string) {
  return spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout: RUN_TIMEOUT_MS,
    maxBuffer: 4 * 1024 * 1024,
  });
}

function parseJavaResult(stdout: string, stderr: string): VisualizationResult {
  const jsonLine = stdout
    .split("\n")
    .reverse()
    .find((line) => line.includes(JSON_MARKER));

  if (jsonLine) {
    const payload = JSON.parse(jsonLine.slice(jsonLine.indexOf(JSON_MARKER) + JSON_MARKER.length));
    return {
      language: "java",
      success: Boolean(payload.success),
      steps: (payload.steps ?? []) as VisualizationStep[],
      finalOutput: payload.finalOutput ?? "",
      error: payload.error,
      visualizationLevel: "full",
    };
  }

  return {
    language: "java",
    success: false,
    steps: [
      {
        step: 1,
        message: "Execution failed",
        variables: [],
        output: stdout,
      },
    ],
    finalOutput: stdout.trim(),
    error: stderr || "Java visualization did not return trace output",
    visualizationLevel: "execution",
  };
}

export function visualizeJava(code: string): VisualizationResult {
  const tmp = makeTempDir();

  try {
    const traceRuntimeDir = path.join(tmp, "codeviz");
    fs.mkdirSync(traceRuntimeDir, { recursive: true });
    fs.copyFileSync(resolveTraceRuntime(), path.join(traceRuntimeDir, "Trace.java"));

    const { code: instrumented, className } = instrumentJava(code);
    const userFile = path.join(tmp, `${className}.java`);
    fs.writeFileSync(userFile, instrumented);

    const compile = runCommand("javac", [path.join(traceRuntimeDir, "Trace.java"), userFile], tmp);
    if (compile.status !== 0) {
      return {
        language: "java",
        success: false,
        steps: [],
        finalOutput: "",
        error: compile.stderr || compile.stdout || "Java compilation failed",
        visualizationLevel: "full",
      };
    }

    const run = runCommand("java", ["-cp", tmp, className], tmp);
    if (run.status !== 0 && !run.stdout.includes(JSON_MARKER)) {
      return {
        language: "java",
        success: false,
        steps: [],
        finalOutput: run.stdout,
        error: run.stderr || run.stdout || "Java execution failed",
        visualizationLevel: "full",
      };
    }

    return parseJavaResult(run.stdout ?? "", run.stderr ?? "");
  } catch (error) {
    return {
      language: "java",
      success: false,
      steps: [],
      finalOutput: "",
      error: error instanceof Error ? error.message : "Java visualization failed",
      visualizationLevel: "full",
    };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
