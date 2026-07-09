import { describe, it, expect } from "vitest";
import { judgeWith } from "../src/judge";
import { DEFAULT_CATALOG } from "../src/catalog";

const run = (prompt: string, cp = 0.5) => judgeWith(prompt, cp, DEFAULT_CATALOG);

describe("judgeWith", () => {
  it("returns a full JudgeResult shape with entry-typed model", () => {
    const r = run("escreva uma função em python");
    expect(typeof r.model.slug).toBe("string");
    expect(r.model.slug.length).toBeGreaterThan(0);
    expect(["low", "medium", "high"]).toContain(r.model.costTier);
    expect(Array.isArray(r.alternatives)).toBe(true);
    expect(r.task).toBe("code");
    expect(["low", "medium", "high"]).toContain(r.complexity);
    expect(typeof r.needsStructuredOutput).toBe("boolean");
    expect(r.confidence).toBeGreaterThanOrEqual(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
    expect(r.reason.length).toBeGreaterThan(0);
    expect(r.catalogVersion).toBe(DEFAULT_CATALOG.version);
  });

  it("reason is English", () => {
    expect(run("escreva uma função em python").reason).toMatch(/confidence/);
    expect(run("   ").reason).toMatch(/trivial/i);
    expect(run("escreva uma função em python").reason).not.toMatch(/confiança|vazio|decisão/i);
  });

  it("empty prompt → trivial decision, no throw", () => {
    const r = run("   ");
    expect(r.task).toBe("chat");
    expect(r.complexity).toBe("low");
    expect(r.model.slug.length).toBeGreaterThan(0);
    expect(r.reason).toMatch(/trivial/i);
  });

  it("JSON request → structured + json_extraction", () => {
    const r = run("extraia os dados e devolva em JSON");
    expect(r.task).toBe("json_extraction");
    expect(r.needsStructuredOutput).toBe(true);
  });

  it("is deterministic", () => {
    expect(run("prove que P != NP")).toEqual(run("prove que P != NP"));
  });
});
