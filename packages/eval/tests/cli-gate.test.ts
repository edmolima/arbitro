import { describe, it, expect } from "vitest";
import { runEval } from "../src/index";
import type { Thresholds } from "../src/report";
import type { EvalDataset } from "../src/types";

const dataset: EvalDataset = {
  version: "fixture.1",
  cases: [
    { id: "c1", prompt: "escreva uma função em rust", lang: "pt", expected: { task: "code", complexity: "medium", needs_structured_output: false, tier: "medium" }, tags: [] },
    { id: "c2", prompt: "oi, tudo bem?", lang: "pt", expected: { task: "chat", complexity: "low", needs_structured_output: false, tier: "low" }, tags: [] },
  ],
};

describe("runEval", () => {
  it("exit code 0 and passing report when thresholds are met", () => {
    const t: Thresholds = { minTaskAccuracy: 0, minComplexityAccuracy: 0, minStructuredAccuracy: 0, maxUnderProvisionRate: 1 };
    const r = runEval(dataset, t);
    expect(r.exitCode).toBe(0);
    expect(r.output).toMatch(/task accuracy/i);
    expect(r.output).toMatch(/PASS/);
  });

  it("exit code 1 and failure listed when a threshold is not met", () => {
    const t: Thresholds = { minTaskAccuracy: 1.1, minComplexityAccuracy: 0, minStructuredAccuracy: 0, maxUnderProvisionRate: 1 };
    const r = runEval(dataset, t);
    expect(r.exitCode).toBe(1);
    expect(r.output).toMatch(/FAIL/);
    expect(r.output).toMatch(/task accuracy/i);
  });
});
