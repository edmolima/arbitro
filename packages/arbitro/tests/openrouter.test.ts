import { describe, it, expect } from "vitest";
import { judge, toOpenRouterBody } from "../src/index";

describe("toOpenRouterBody", () => {
  it("uses the chosen slug and a single user message", () => {
    const prompt = "write a python script to parse a CSV file";
    const decision = judge(prompt);
    const body = toOpenRouterBody(decision, prompt);
    expect(body.model).toBe(decision.model.slug);
    expect(body.messages).toEqual([{ role: "user", content: prompt }]);
  });
});
