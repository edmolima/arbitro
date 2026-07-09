import { describe, it, expect, vi } from "vitest";
import { judge } from "arbitro";
import { buildRequest, ask, OPENROUTER_URL } from "../src/openrouter";

const PROMPT = "write a python script to parse a CSV file";
const KEY = "sk-test-key";

describe("buildRequest", () => {
  it("targets the OpenRouter endpoint with auth and json headers", () => {
    const req = buildRequest(judge(PROMPT), PROMPT, KEY);
    expect(req.url).toBe(OPENROUTER_URL);
    expect(req.headers.Authorization).toBe(`Bearer ${KEY}`);
    expect(req.headers["Content-Type"]).toBe("application/json");
  });

  it("puts the model arbitro picked and the prompt in the body", () => {
    const decision = judge(PROMPT);
    const req = buildRequest(decision, PROMPT, KEY);
    const body = JSON.parse(req.body);
    expect(body.model).toBe(decision.model);
    expect(body.messages).toEqual([{ role: "user", content: PROMPT }]);
  });
});

describe("ask", () => {
  it("sends the built request and returns the completion content", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "hi" } }] }),
    });

    const { decision, content } = await ask(PROMPT, KEY, fetchImpl as unknown as typeof fetch);

    expect(content).toBe("hi");
    expect(decision.model).toBe(judge(PROMPT).model);
    const [url, init] = fetchImpl.mock.calls[0]!;
    expect(url).toBe(OPENROUTER_URL);
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe(`Bearer ${KEY}`);
    expect(JSON.parse(init.body).model).toBe(decision.model);
  });

  it("throws on a non-ok response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "unauthorized",
    });

    await expect(
      ask(PROMPT, KEY, fetchImpl as unknown as typeof fetch),
    ).rejects.toThrow("OpenRouter 401");
  });
});
