import { describe, it, expect } from "vitest";
import { validateDataset } from "../src/dataset-schema";

const validCase = {
  id: "code-001",
  prompt: "escreva uma função em rust",
  lang: "pt",
  expected: { task: "code", complexity: "medium", needs_structured_output: false, tier: "medium" },
  tags: ["code", "pt"],
};

describe("validateDataset", () => {
  it("accepts a well-formed dataset", () => {
    const r = validateDataset({ version: "test.1", cases: [validCase] });
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it("rejects a non-object / missing cases array", () => {
    expect(validateDataset(null).valid).toBe(false);
    expect(validateDataset({ version: "x" }).valid).toBe(false);
  });

  it("rejects an invalid task enum", () => {
    const bad = { ...validCase, expected: { ...validCase.expected, task: "poetry" } };
    const r = validateDataset({ version: "x", cases: [bad] });
    expect(r.valid).toBe(false);
    expect(r.errors.join(" ")).toMatch(/task/);
  });

  it("rejects an invalid tier / complexity / lang", () => {
    const badTier = { ...validCase, expected: { ...validCase.expected, tier: "ultra" } };
    const badLang = { ...validCase, lang: "fr" };
    expect(validateDataset({ version: "x", cases: [badTier] }).valid).toBe(false);
    expect(validateDataset({ version: "x", cases: [badLang] }).valid).toBe(false);
  });

  it("rejects duplicate ids", () => {
    const r = validateDataset({ version: "x", cases: [validCase, validCase] });
    expect(r.valid).toBe(false);
    expect(r.errors.join(" ")).toMatch(/duplicate/i);
  });

  it("rejects a missing required field", () => {
    const noPrompt = { ...validCase } as Record<string, unknown>;
    delete noPrompt.prompt;
    expect(validateDataset({ version: "x", cases: [noPrompt] }).valid).toBe(false);
  });
});

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

describe("committed cases.json", () => {
  it("is a valid dataset", () => {
    const path = fileURLToPath(new URL("../dataset/cases.json", import.meta.url));
    const data = JSON.parse(readFileSync(path, "utf8"));
    const r = validateDataset(data);
    expect(r.errors).toEqual([]);
    expect(r.valid).toBe(true);
    expect(data.cases.length).toBeGreaterThanOrEqual(15);
  });
});
