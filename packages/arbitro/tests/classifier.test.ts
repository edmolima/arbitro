import { describe, it, expect } from "vitest";
import { classify } from "../src/classifier";
import { extractSignals } from "../src/signals";

const decide = (prompt: string) => classify(extractSignals(prompt));

describe("classify", () => {
  it("rule 4: explicit JSON request → json_extraction + structured", () => {
    const d = decide("extraia nome e email deste texto e devolva em JSON");
    expect(d.task).toBe("json_extraction");
    expect(d.needsStructuredOutput).toBe(true);
    expect(d.confidence).toBeGreaterThan(0.7);
  });

  it("trivial greeting → chat / low / high confidence", () => {
    const d = decide("oi, tudo bem?");
    expect(d.task).toBe("chat");
    expect(d.complexity).toBe("low");
    expect(d.confidence).toBeGreaterThan(0.7);
  });

  it("rule 5: ambiguous non-greeting → chat / medium / low confidence", () => {
    const d = decide("me ajuda com isso aqui por favor");
    expect(d.task).toBe("chat");
    expect(d.complexity).toBe("medium");
    expect(d.confidence).toBeLessThan(0.5);
  });

  it("summary keyword → summary, at least medium complexity", () => {
    const d = decide("resuma este relatório técnico de rede");
    expect(d.task).toBe("summary");
    expect(d.complexity).toBe("medium");
  });

  it("prove-a-theorem → research / high", () => {
    const d = decide("prove que este algoritmo distribuído é livre de deadlock");
    expect(d.task).toBe("research");
    expect(d.complexity).toBe("high");
  });

  it("research beats code on a tie (tie-break order)", () => {
    // "prove" hits research; "algoritmo" hits code → tie resolved to research
    const d = decide("prove o algoritmo");
    expect(d.task).toBe("research");
  });

  it("translation keyword → translation", () => {
    expect(decide("traduza este parágrafo para o inglês").task).toBe("translation");
  });

  it("confidence stays within [0,1]", () => {
    const d = decide("escreva uma função em python que ordena uma lista");
    expect(d.confidence).toBeGreaterThanOrEqual(0);
    expect(d.confidence).toBeLessThanOrEqual(1);
  });
});
