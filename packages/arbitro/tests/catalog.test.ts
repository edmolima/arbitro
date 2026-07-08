import { describe, it, expect } from "vitest";
import { DEFAULT_CATALOG } from "../src/catalog";
import type { Task } from "../src/types";

const ALL_TASKS: Task[] = ["chat", "summary", "code", "research", "json_extraction", "translation"];

describe("DEFAULT_CATALOG", () => {
  it("has a version and at least three models", () => {
    expect(DEFAULT_CATALOG.version).toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(DEFAULT_CATALOG.models.length).toBeGreaterThanOrEqual(3);
  });

  it("has unique slugs", () => {
    const slugs = DEFAULT_CATALOG.models.map((m) => m.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("has at least one model per cost tier", () => {
    const tiers = new Set(DEFAULT_CATALOG.models.map((m) => m.costTier));
    expect(tiers.has("low")).toBe(true);
    expect(tiers.has("medium")).toBe(true);
    expect(tiers.has("high")).toBe(true);
  });

  it("has at least one structured-output-capable model", () => {
    expect(DEFAULT_CATALOG.models.some((m) => m.supportsStructuredOutput)).toBe(true);
  });

  it("covers every task with at least one strong model", () => {
    for (const task of ALL_TASKS) {
      expect(DEFAULT_CATALOG.models.some((m) => m.strengths.includes(task))).toBe(true);
    }
  });

  it("uses well-formed OpenRouter slugs (provider/model)", () => {
    for (const m of DEFAULT_CATALOG.models) {
      expect(m.slug).toMatch(/^[a-z0-9-]+\/[a-z0-9.\-]+$/);
      expect(m.contextWindow).toBeGreaterThan(0);
    }
  });
});
