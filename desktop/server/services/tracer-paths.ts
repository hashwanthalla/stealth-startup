import fs from "fs";
import path from "path";

export function tracerCandidates(subdir: string, file: string): string[] {
  const candidates: string[] = [];
  const tracerRoot = process.env.CODEVIZ_TRACER_ROOT;
  if (tracerRoot) {
    candidates.push(path.join(tracerRoot, subdir, file));
  }
  candidates.push(path.join(__dirname, "..", subdir, file));
  candidates.push(path.join(process.cwd(), "server", subdir, file));
  return candidates;
}

export function resolveTracerFile(subdir: string, file: string): string {
  for (const candidate of tracerCandidates(subdir, file)) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`${file} not found in ${subdir}`);
}
