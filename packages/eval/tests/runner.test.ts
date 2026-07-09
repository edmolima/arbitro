import { describe, it, expect } from "vitest";
import { predict } from "../src/runner";
import type { EvalDataset } from "../src/types";
import { DEFAULT_CATALOG } from "arbitro";

const dataset: EvalDataset = {
  version: "fixture.1",
  cases: [
    { id: "c1", prompt: "escreva uma função em rust", lang: "pt", expected: { task: "code", complexity: "medium", needs_structured_output: false, tier: "medium" }, tags: [] },
    { id: "c2", prompt: "extraia os dados e devolva em JSON", lang: "pt", expected: { task: "json_extraction", complexity: "low", needs_structured_output: true, tier: "low" }, tags: [] },
  ],
};

describe("predict", () => {
  it("returns one prediction per case, preserving id order", () => {
    const preds = predict(dataset);
    expect(preds.map((p) => p.id)).toEqual(["c1", "c2"]);
  });

  it("classifies the code and json prompts", () => {
    const [c1, c2] = predict(dataset);
    expect(c1!.task).toBe("code");
    expect(c2!.task).toBe("json_extraction");
    expect(c2!.needs_structured_output).toBe(true);
  });

  it("resolves each chosen model's tier from the catalog", () => {
    const validTiers = new Set(["low", "medium", "high"]);
    for (const p of predict(dataset)) {
      expect(p.model.length).toBeGreaterThan(0);
      expect(validTiers.has(p.tier)).toBe(true);
      const entry = DEFAULT_CATALOG.models.find((m) => m.slug === p.model);
      expect(entry).toBeDefined();
      expect(p.tier).toBe(entry!.costTier);
    }
  });

  it("is deterministic", () => {
    expect(predict(dataset)).toEqual(predict(dataset));
  });
});
