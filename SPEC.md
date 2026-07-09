# SPEC — OpenRouter usage example

**Date:** 2026-07-09
**Status:** Draft (awaiting approval)

## 1. Objective

Close arbitro's "last mile." Today the playground shows *which* model arbitro
picks but never calls it. This adds a runnable example that takes the slug
`judge()` returns and makes a real OpenRouter chat-completion call — so a new
user sees the full loop: **prompt → arbitro picks a model → call that model on
OpenRouter → get the answer.**

**Target users:** developers evaluating arbitro who want to confirm "and then I
actually use this slug — how?" in one command.

## 2. Scope

- **In:** one new module in `examples/playground` that wires `arbitro.judge()`
  to OpenRouter via native `fetch`; a `pnpm` script to run it; a README section.
- **Out:** changing the `arbitro` library (it stays offline/zero-dep); retries,
  streaming, cost accounting, multi-turn chat, adding the `openai` SDK.

## 3. Design

New file: `examples/playground/src/openrouter.ts`. Split into a **pure**
request builder (testable offline) and a thin async caller using global `fetch`.

```ts
import { judge, type JudgeResult } from "arbitro";

export const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export interface OpenRouterRequest {
  url: string;
  headers: Record<string, string>;
  body: string;
}

// Pure — no I/O. This is the unit under test.
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

// fetch is injectable so tests never hit the network.
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
```

CLI entry at the bottom of the same file (runs only when invoked directly):

```ts
if (process.argv[1]?.endsWith("openrouter.ts")) {
  const prompt = process.argv.slice(2).join(" ").trim();
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.log(
      "Set OPENROUTER_API_KEY to run this example live:\n" +
        "  OPENROUTER_API_KEY=sk-... pnpm -F playground openrouter \"your prompt\"\n" +
        "(No key set — nothing was sent.)",
    );
    process.exit(0); // no-op, exit clean so CI/dry-runs never fail
  }
  const p = prompt || "write a python script to parse a CSV file";
  ask(p, apiKey).then(({ decision, content }) => {
    console.log(`\narbitro → ${decision.model}  (${decision.task}/${decision.complexity})\n`);
    console.log(content + "\n");
  });
}
```

## 4. Commands

Run from repo root:

| Command | Effect |
| --- | --- |
| `pnpm -F playground openrouter "your prompt"` | Route + call OpenRouter live (needs key). |
| `pnpm -F playground openrouter` | Same, using a default sample prompt. |
| `pnpm -F playground test` | Offline unit tests (no key, no network). |

New script in `examples/playground/package.json`:
`"openrouter": "tsx src/openrouter.ts"`.

## 5. Project structure

```
examples/playground/
  src/
    openrouter.ts        # NEW — buildRequest (pure) + ask() + CLI entry
    index.ts             # unchanged
    batch.ts             # unchanged
    prompts.ts           # unchanged
  tests/
    openrouter.test.ts   # NEW — offline tests
    batch.test.ts        # unchanged
  package.json           # + "openrouter" script
```

Root `README.md`: add a "Calling the model (OpenRouter)" section after "Tuning
cost vs quality", showing the `ask()` snippet and the `pnpm` command.

## 6. Code style

- Match existing playground style: ESM, explicit types on exports, no new deps.
- Native `fetch` only (Node ≥18). No `openai` SDK, no `axios`.
- Keep I/O (`ask`) separate from pure logic (`buildRequest`).
- Secrets come from `process.env.OPENROUTER_API_KEY` — never hardcode or log the key.

## 7. Testing strategy

`examples/playground/tests/openrouter.test.ts`, all offline:

1. `buildRequest` targets `OPENROUTER_URL`, sets `Authorization: Bearer <key>`
   and `Content-Type: application/json`.
2. `buildRequest` body contains the model slug that `judge(prompt)` returns and
   the prompt as a single user message.
3. `ask` with a stubbed `fetchImpl` (returns `{ ok: true, json: () => ({ choices:
   [{ message: { content: "hi" } }] }) }`) resolves to `{ decision, content: "hi" }`
   and passes `POST` + the built headers/body to the stub.
4. `ask` throws on a non-ok response (stub `{ ok: false, status: 401, text: ... }`).

No test reads a real key or touches the network; CI stays green without secrets.

## 8. Boundaries

- **Always:** keep the `arbitro` package offline and dependency-free; read the
  key from env; make the network call opt-in (no key ⇒ clean no-op).
- **Ask first:** adding any runtime dependency; making the live call run during
  `test`/CI; changing the public API of `arbitro`.
- **Never:** hardcode or log API keys; send network requests from unit tests;
  commit a `.env` or real key.

## 9. Acceptance criteria

1. `pnpm -F playground openrouter "…"` with no key prints the setup hint and
   exits 0 without any network call.
2. With a valid key, it prints `arbitro → <model>` and the model's reply.
3. `pnpm -F playground test` passes offline (new tests included).
4. `pnpm build && pnpm typecheck && pnpm test && pnpm eval` all pass.
5. README shows the OpenRouter usage snippet + command.
6. No new dependencies in any `package.json`.
