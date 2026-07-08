import { describe, it, expect } from "vitest";
import { pickModel } from "../src/matcher";
import { DEFAULT_CATALOG } from "../src/catalog";
import type { Classification } from "../src/types";

const c = (over: Partial<Classification>): Classification => ({
  task: "chat",
  complexity: "low",
  needs_structured_output: false,
  confidence: 0.8,
  ...over,
});

describe("pickModel", () => {
  it("code + high + quality preference → a high-capability code model", () => {
    const r = pickModel(c({ task: "code", complexity: "high" }), 0.8, DEFAULT_CATALOG);
    expect(r.model).toBe("anthropic/claude-opus-4.1");
  });

  it("chat + low + cost preference → cheapest fit (deterministic tie-break)", () => {
    const r = pickModel(c({ task: "chat", complexity: "low" }), 0.2, DEFAULT_CATALOG);
    expect(r.model).toBe("anthropic/claude-haiku-4.5");
  });

  it("structured output required → only structured-capable models are chosen", () => {
    const r = pickModel(
      c({ task: "json_extraction", complexity: "low", needs_structured_output: true }),
      0.5,
      DEFAULT_CATALOG,
    );
    const chosen = [r.model, ...r.alternatives];
    expect(chosen).not.toContain("deepseek/deepseek-chat");
  });

  it("returns up to 3 alternatives, excluding the winner", () => {
    const r = pickModel(c({ task: "chat", complexity: "low" }), 0.5, DEFAULT_CATALOG);
    expect(r.alternatives.length).toBeLessThanOrEqual(3);
    expect(r.alternatives).not.toContain(r.model);
  });

  it("clamps out-of-range costPreference without throwing", () => {
    expect(() => pickModel(c({ task: "chat" }), 5, DEFAULT_CATALOG)).not.toThrow();
    expect(() => pickModel(c({ task: "chat" }), -3, DEFAULT_CATALOG)).not.toThrow();
  });

  it("is deterministic: same input → same output", () => {
    const args = () => pickModel(c({ task: "research", complexity: "high" }), 0.7, DEFAULT_CATALOG);
    expect(args()).toEqual(args());
  });
});
