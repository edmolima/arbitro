import { describe, it, expect } from "vitest";
import { evaluate, formatReport, checkThresholds } from "../src/report";
import type { Thresholds } from "../src/report";
import type { EvalDataset } from "../src/types";

const dataset: EvalDataset = {
  version: "fixture.1",
  cases: [
    { id: "c1", prompt: "escreva uma função em rust", lang: "pt", expected: { task: "code", complexity: "medium", needs_structured_output: false, tier: "medium" }, tags: [] },
    { id: "c2", prompt: "extraia os dados e devolva em JSON", lang: "pt", expected: { task: "json_extraction", complexity: "low", needs_structured_output: true, tier: "low" }, tags: [] },
    { id: "c3", prompt: "oi, tudo bem?", lang: "pt", expected: { task: "chat", complexity: "low", needs_structured_output: false, tier: "low" }, tags: [] },
  ],
};

describe("evaluate", () => {
  it("computes accuracies, cost, and savings over the dataset", () => {
    const r = evaluate(dataset);
    expect(r.n).toBe(3);
    expect(r.taskAccuracy).toBeGreaterThan(0.5);
    expect(r.taskMacroF1).toBeGreaterThan(0);
    expect(r.simulatedCost).toBeLessThanOrEqual(r.alwaysPremiumCost);
    expect(r.savingsPct).toBeGreaterThanOrEqual(0);
    expect(r.savingsPct).toBeLessThanOrEqual(100);
  });
});

describe("formatReport", () => {
  it("produces a non-empty human-readable string mentioning the key metrics", () => {
    const s = formatReport(evaluate(dataset));
    expect(s).toMatch(/task accuracy/i);
    expect(s).toMatch(/savings/i);
  });
});

describe("checkThresholds", () => {
  const report = evaluate(dataset);
  it("passes when all thresholds are met", () => {
    const t: Thresholds = { minTaskAccuracy: 0, minComplexityAccuracy: 0, minStructuredAccuracy: 0, maxUnderProvisionRate: 1 };
    expect(checkThresholds(report, t).passed).toBe(true);
  });
  it("fails and lists the offending metric when a threshold is not met", () => {
    const t: Thresholds = { minTaskAccuracy: 1.1, minComplexityAccuracy: 0, minStructuredAccuracy: 0, maxUnderProvisionRate: 1 };
    const r = checkThresholds(report, t);
    expect(r.passed).toBe(false);
    expect(r.failures.join(" ")).toMatch(/task accuracy/i);
  });
});
