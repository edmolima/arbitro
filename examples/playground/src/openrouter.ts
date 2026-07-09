// End-to-end example: let arbitro pick a model, then actually call it on
// OpenRouter (an OpenAI-compatible endpoint) using native fetch — no SDK.
import { judge, type JudgeResult } from "@edmolima/arbitro";

export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export interface OpenRouterRequest {
  url: string;
  headers: Record<string, string>;
  body: string;
}

// Pure — no I/O. Given a routing decision, build the OpenRouter request.
export function buildRequest(
  decision: JudgeResult,
  prompt: string,
  apiKey: string,
): OpenRouterRequest {
  return {
    url: OPENROUTER_URL,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: decision.model,
      messages: [{ role: "user", content: prompt }],
    }),
  };
}

export interface AskResult {
  decision: JudgeResult;
  content: string;
}

// Route the prompt, then call the chosen model. `fetchImpl` is injectable so
// tests never touch the network.
export async function ask(
  prompt: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<AskResult> {
  const decision = judge(prompt);
  const req = buildRequest(decision, prompt, apiKey);
  const res = await fetchImpl(req.url, {
    method: "POST",
    headers: req.headers,
    body: req.body,
  });
  if (!res.ok) {
    throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return { decision, content: json.choices?.[0]?.message?.content ?? "" };
}

// CLI entry — runs only when this file is executed directly.
if (process.argv[1]?.endsWith("openrouter.ts")) {
  const prompt = process.argv.slice(2).join(" ").trim();
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.log(
      "Set OPENROUTER_API_KEY to run this example live:\n" +
        '  OPENROUTER_API_KEY=sk-... pnpm -F playground openrouter "your prompt"\n' +
        "(No key set — nothing was sent.)",
    );
    process.exit(0);
  }
  const p = prompt || "write a python script to parse a CSV file";
  ask(p, apiKey)
    .then(({ decision, content }) => {
      console.log(
        `\narbitro → ${decision.model}  (${decision.task}/${decision.complexity})\n`,
      );
      console.log(content + "\n");
    })
    .catch((err) => {
      console.error(String(err));
      process.exit(1);
    });
}
