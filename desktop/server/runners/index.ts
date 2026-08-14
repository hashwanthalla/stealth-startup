import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import type { VisualizationResult, VisualizationStep } from "../../shared/types";

export { visualizeJava } from "./java";
export { visualizeCSharp } from "./csharp";
export { visualizeGo } from "./go";
export { visualizeC, visualizeCpp } from "./native";

const RUN_TIMEOUT_MS = 12000;

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "codeviz-"));
}

function runCommand(command: string, args: string[], cwd?: string) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    timeout: RUN_TIMEOUT_MS,
    maxBuffer: 4 * 1024 * 1024,
  });
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    code: result.status ?? 1,
  };
}

function executionSteps(output: string, error?: string): VisualizationStep[] {
  const lines = output.split("\n").filter(Boolean);
  if (lines.length === 0) {
    return [
      {
        step: 1,
        message: error ? "Execution failed" : "Program finished with no output",
        variables: [],
        output,
      },
    ];
  }
  return lines.map((line, index) => ({
    step: index + 1,
    message: `Output line ${index + 1}`,
    variables: [],
    output: lines.slice(0, index + 1).join("\n"),
  }));
}

function runPythonCommand(tracerFile: string) {
  let result = runCommand("python3", [tracerFile]);
  if (!result.stdout.trim()) {
    result = runCommand("python", [tracerFile]);
  }
  return result;
}

export function visualizePython(code: string): VisualizationResult {
  const tmp = makeTempDir();
  const userFile = path.join(tmp, "user_code.py");
  const tracerFile = path.join(tmp, "tracer.py");

  const tracer = `
import json, sys, traceback

steps = []
output_lines = []
_real_stdout = sys.__stdout__

def serialize(value):
    if isinstance(value, (int, float, str, bool)) or value is None:
        return repr(value)
    if isinstance(value, (list, tuple)):
        return "[" + ", ".join(serialize(v) for v in value) + "]"
    return str(value)

def trace(frame, event, arg):
    if frame.f_code.co_filename != "user_code.py":
        return None
    if event == "line":
        lineno = frame.f_lineno
        locals_ = {k: serialize(v) for k, v in frame.f_locals.items() if not k.startswith("__")}
        steps.append({
            "step": len(steps) + 1,
            "line": lineno,
            "message": f"Executing line {lineno}",
            "variables": [{"name": k, "value": v} for k, v in locals_.items()],
            "output": "\\n".join(output_lines),
        })
    return trace

class Writer:
    def write(self, text):
        if text:
            output_lines.append(text.rstrip("\\n"))
    def flush(self):
        pass

sys.stdout = Writer()
sys.settrace(trace)

def emit(payload):
    sys.stdout = _real_stdout
    print(json.dumps(payload))

try:
    with open("${userFile.replace(/\\/g, "/")}", "r") as f:
        source = f.read()
    compiled = compile(source, "user_code.py", "exec")
    exec(compiled, {"__name__": "__main__"})
    if steps:
        steps[-1]["output"] = "\\n".join(output_lines)
    emit({
        "success": True,
        "steps": steps,
        "finalOutput": "\\n".join(output_lines),
        "visualizationLevel": "full"
    })
except Exception as e:
    emit({
        "success": False,
        "steps": steps,
        "finalOutput": "\\n".join(output_lines),
        "error": traceback.format_exc(),
        "visualizationLevel": "full"
    })
`;

  fs.writeFileSync(userFile, code);
  fs.writeFileSync(tracerFile, tracer);

  try {
    const result = runPythonCommand(tracerFile);
    const stdout = result.stdout.trim();
    if (!stdout) {
      return {
        language: "python",
        success: false,
        steps: [],
        finalOutput: "",
        error: result.stderr.trim() || "Python tracer produced no output. Is Python installed?",
        visualizationLevel: "execution",
      };
    }
    const parsed = JSON.parse(stdout.split("\n").pop() ?? "{}");
    return {
      language: "python",
      success: parsed.success,
      steps: parsed.steps ?? [],
      finalOutput: parsed.finalOutput ?? "",
      error: parsed.error,
      visualizationLevel: "full",
    };
  } catch (error) {
    return {
      language: "python",
      success: false,
      steps: [],
      finalOutput: "",
      error: error instanceof Error ? error.message : "Failed to parse Python visualization output",
      visualizationLevel: "execution",
    };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

export function visualizeJavaScript(code: string): VisualizationResult {
  const outputLines: string[] = [];
  try {
    const instrumented = `
      const __steps = [];
      const __output = [];
      const __serialize = (value) => {
        if (value === null || typeof value !== "object") return String(value);
        if (Array.isArray(value)) return "[" + value.map(__serialize).join(", ") + "]";
        return JSON.stringify(value);
      };
      const __log = (...args) => {
        __output.push(args.map(__serialize).join(" "));
        console.log(...args);
      };
      ${code.replace(/console\.log/g, "__log")}
      return { steps: __steps, finalOutput: __output.join("\\n"), success: true };
    `;
    const fn = new Function(instrumented) as () => {
      steps: VisualizationStep[];
      finalOutput: string;
      success: boolean;
    };
    const result = fn();
    return {
      language: "javascript",
      success: result.success,
      steps: result.steps.length
        ? result.steps
        : [{ step: 1, message: "Code executed successfully", variables: [], output: result.finalOutput }],
      finalOutput: result.finalOutput,
      visualizationLevel: "full",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      language: "javascript",
      success: false,
      steps: executionSteps(outputLines.join("\n"), message),
      finalOutput: outputLines.join("\n"),
      error: message,
      visualizationLevel: "full",
    };
  }
}
