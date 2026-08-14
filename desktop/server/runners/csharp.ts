import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import type { VisualizationResult, VisualizationStep } from "../../shared/types";
import { instrumentCSharp } from "../csharp-tracer/instrument";
import { resolveTracerFile } from "../services/tracer-paths";

const JSON_MARKER = "__CODEVIZ_JSON__";

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "codeviz-csharp-"));
}

type CommandResult = {
  status: number | null;
  stdout: string;
  stderr: string;
  error?: NodeJS.ErrnoException;
};

function run(cmd: string, args: string[], cwd?: string): CommandResult {
  const result = spawnSync(cmd, args, { cwd, encoding: "utf8", timeout: 12000, maxBuffer: 4 * 1024 * 1024 });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error as NodeJS.ErrnoException | undefined,
  };
}

function missingCommandError(command: string, result: CommandResult) {
  if (result.error?.code === "ENOENT") {
    return `${command} is not installed or not on PATH. Install it to visualize C# code.`;
  }
  return "";
}

function resolveCSharpCompiler() {
  for (const command of ["csc", "mcs", "dotnet"]) {
    const probe = run(command, command === "dotnet" ? ["--version"] : ["/help"]);
    if (!probe.error || probe.error.code !== "ENOENT") return command;
  }
  return null;
}

function compileAndRunCSharp(tmp: string): CommandResult {
  const compiler = resolveCSharpCompiler();
  if (!compiler) {
    return {
      status: 1,
      stdout: "",
      stderr: "No C# compiler found. Install the .NET SDK (dotnet) or Mono (mcs).",
    };
  }

  if (compiler === "dotnet") {
    fs.writeFileSync(
      path.join(tmp, "CodevizApp.csproj"),
      `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net10.0</TargetFramework>
    <ImplicitUsings>disable</ImplicitUsings>
    <Nullable>disable</Nullable>
  </PropertyGroup>
</Project>`
    );
    const build = run("dotnet", ["run", "--project", tmp], tmp);
    return build;
  }

  const compile = run(compiler, compiler === "csc" ? ["/nologo", "Trace.cs", "Program.cs"] : ["Trace.cs", "Program.cs"], tmp);
  if (compile.status !== 0) return compile;
  const executable =
    compiler === "csc"
      ? path.join(tmp, "Program.exe")
      : path.join(tmp, "Program.exe");
  return run(executable, [], tmp);
}

function resolve(file: string) {
  return resolveTracerFile("csharp-tracer", file);
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
    const exec = compileAndRunCSharp(tmp);
    if (exec.status !== 0 && !String(exec.stdout).includes(JSON_MARKER)) {
      const missing = missingCommandError("dotnet", exec);
      return {
        language: "csharp",
        success: false,
        steps: [],
        finalOutput: exec.stdout,
        error: missing || exec.stderr || exec.stdout || "C# execution failed",
        visualizationLevel: "full",
      };
    }
    return parse(exec.stdout ?? "");
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
