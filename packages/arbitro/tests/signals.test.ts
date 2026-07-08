import { describe, it, expect } from "vitest";
import { extractSignals } from "../src/signals";

describe("extractSignals", () => {
  it("measures length and word count on trimmed text", () => {
    const s = extractSignals("  ola mundo  ");
    expect(s.length).toBe(9);
    expect(s.wordCount).toBe(2);
  });

  it("flags code fences", () => {
    expect(extractSignals("veja:\n```ts\nconst x = 1\n```").hasCodeFence).toBe(true);
    expect(extractSignals("apenas texto").hasCodeFence).toBe(false);
  });

  it("counts questions and enumerated steps", () => {
    const s = extractSignals("faça isto:\n1. abrir\n2. ler\n3. fechar\nok?");
    expect(s.questionCount).toBe(1);
    expect(s.stepCount).toBe(3);
  });

  it("detects math and structured-output requests", () => {
    expect(extractSignals("calcule 2 + 2").hasMath).toBe(true);
    expect(extractSignals("devolva em JSON").requestsStructuredOutput).toBe(true);
  });

  it("detects trivial chat", () => {
    expect(extractSignals("oi, tudo bem?").isTrivialChat).toBe(true);
    expect(extractSignals("escreva uma função").isTrivialChat).toBe(false);
  });

  it("counts task keyword hits", () => {
    const s = extractSignals("escreva uma função em python");
    expect(s.taskHits.code).toBeGreaterThan(0);
    expect(s.taskHits.summary).toBe(0);
  });

  it("returns zero everything on empty input", () => {
    const s = extractSignals("   ");
    expect(s.length).toBe(0);
    expect(s.wordCount).toBe(0);
    expect(s.taskHits.code).toBe(0);
  });
});
