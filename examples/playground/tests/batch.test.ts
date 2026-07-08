import { describe, it, expect } from "vitest";
import { runBatch } from "../src/batch";
import { SAMPLE_PROMPTS } from "../src/prompts";

describe("runBatch", () => {
  it("returns one row per sample prompt", () => {
    const rows = runBatch();
    expect(rows.length).toBe(SAMPLE_PROMPTS.length);
  });

  it("every row has a non-empty model and matching prompt", () => {
    const rows = runBatch();
    for (const row of rows) {
      expect(row.model.length).toBeGreaterThan(0);
      expect(SAMPLE_PROMPTS).toContain(row.prompt);
    }
  });

  it("routes the JSON prompt to json_extraction", () => {
    const rows = runBatch();
    const jsonRow = rows.find((r) => r.prompt.includes("devolva em JSON"));
    expect(jsonRow?.task).toBe("json_extraction");
  });

  it("respects costPreference (cheap run never errors)", () => {
    expect(() => runBatch(0)).not.toThrow();
    expect(() => runBatch(1)).not.toThrow();
  });
});
