import { describe, it, expect } from "vitest";
import {
  TASK_KEYWORDS,
  STRUCTURED_PATTERNS,
  MATH_PATTERNS,
  TRIVIAL_CHAT,
} from "../src/keywords";

const hits = (patterns: RegExp[], text: string) =>
  patterns.filter((r) => r.test(text)).length;

describe("keywords", () => {
  it("detects code prompts in PT and EN", () => {
    expect(hits(TASK_KEYWORDS.code, "escreva uma função em rust")).toBeGreaterThan(0);
    expect(hits(TASK_KEYWORDS.code, "write a python script")).toBeGreaterThan(0);
  });

  it("detects summary prompts", () => {
    expect(hits(TASK_KEYWORDS.summary, "resuma este relatório")).toBeGreaterThan(0);
    expect(hits(TASK_KEYWORDS.summary, "summarize this article")).toBeGreaterThan(0);
  });

  it("detects translation prompts", () => {
    expect(hits(TASK_KEYWORDS.translation, "traduza para o inglês")).toBeGreaterThan(0);
    expect(hits(TASK_KEYWORDS.translation, "translate this to spanish")).toBeGreaterThan(0);
  });

  it("detects research prompts", () => {
    expect(hits(TASK_KEYWORDS.research, "prove que o algoritmo termina")).toBeGreaterThan(0);
  });

  it("does not fire research on a plain summary prompt", () => {
    expect(hits(TASK_KEYWORDS.research, "resuma este relatório técnico de rede")).toBe(0);
  });

  it("detects explicit structured-output requests", () => {
    expect(hits(STRUCTURED_PATTERNS, "devolva em JSON")).toBeGreaterThan(0);
    expect(hits(STRUCTURED_PATTERNS, "return a table")).toBeGreaterThan(0);
  });

  it("detects math signals", () => {
    expect(hits(MATH_PATTERNS, "calcule a integral de x^2")).toBeGreaterThan(0);
  });

  it("detects trivial greetings", () => {
    expect(hits(TRIVIAL_CHAT, "oi, tudo bem?")).toBeGreaterThan(0);
    expect(hits(TRIVIAL_CHAT, "hello there")).toBeGreaterThan(0);
  });

  it("json_extraction and chat have no direct keywords (set by rules/default)", () => {
    expect(TASK_KEYWORDS.json_extraction.length).toBe(0);
    expect(TASK_KEYWORDS.chat.length).toBe(0);
  });
});
