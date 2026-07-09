import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { evaluate, formatReport, checkThresholds, type Thresholds, type EvalReport } from "./report";
import { validateDataset } from "./dataset-schema";
import type { EvalDataset } from "./types";

export function runEval(
  dataset: EvalDataset,
  thresholds: Thresholds,
): { report: EvalReport; output: string; exitCode: number } {
  const report = evaluate(dataset);
  const gate = checkThresholds(report, thresholds);
  const lines = [formatReport(report), ""];
  if (gate.passed) {
    lines.push("PASS — all thresholds met");
  } else {
    lines.push("FAIL — thresholds not met:");
    for (const f of gate.failures) lines.push(`  - ${f}`);
  }
  return { report, output: lines.join("\n"), exitCode: gate.passed ? 0 : 1 };
}

function loadJson<T>(relPath: string): T {
  const path = fileURLToPath(new URL(relPath, import.meta.url));
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function main(): void {
  const raw = loadJson<unknown>("../dataset/cases.json");
  const validation = validateDataset(raw);
  if (!validation.valid) {
    console.error("Invalid dataset:\n" + validation.errors.map((e) => "  - " + e).join("\n"));
    process.exit(2);
  }
  const thresholds = loadJson<Thresholds>("../thresholds.json");
  const { output, exitCode } = runEval(raw as EvalDataset, thresholds);
  console.log(output);
  process.exit(exitCode);
}

// Run only when invoked as a script (not when imported by tests).
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) main();
