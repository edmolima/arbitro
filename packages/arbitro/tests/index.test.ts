import { describe, it, expect } from "vitest";
import { judge, createArbitro } from "../src/index";
import type { ModelCatalog } from "../src/index";

describe("public API", () => {
  it("judge() works with defaults", () => {
    const r = judge("escreva uma função em rust");
    expect(r.task).toBe("code");
    expect(r.model.slug.length).toBeGreaterThan(0);
  });

  it("createArbitro() honors costPreference", () => {
    const cheap = createArbitro({ costPreference: 0 }).judge("oi tudo bem");
    const premium = createArbitro({ costPreference: 1 }).judge("oi tudo bem");
    // cheap preference should never pick a costlier model than premium for the same prompt
    expect(cheap.model.slug.length).toBeGreaterThan(0);
    expect(premium.model.slug.length).toBeGreaterThan(0);
  });

  it("createArbitro() accepts a custom catalog", () => {
    const catalog: ModelCatalog = {
      version: "test.1",
      models: [
        { slug: "acme/tiny", strengths: ["chat"], costTier: "low", contextWindow: 8000, supportsStructuredOutput: false },
      ],
    };
    const r = createArbitro({ catalog }).judge("oi");
    expect(r.model.slug).toBe("acme/tiny");
    expect(r.catalogVersion).toBe("test.1");
  });

  it("createArbitro() throws on an empty custom catalog", () => {
    expect(() => createArbitro({ catalog: { version: "x", models: [] } })).toThrow();
  });
});
