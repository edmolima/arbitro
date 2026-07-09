# arbitro

[![CI](https://github.com/edmolima/arbitro/actions/workflows/ci.yml/badge.svg)](https://github.com/edmolima/arbitro/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

<p align="center">
  <img src="./assets/referee.webp" alt="arbitro — the referee that calls the model" width="480">
</p>

Deterministic model router. Given a prompt, arbitro tells you the **best
OpenRouter model** to use — before you spend the call. No network, no
dependencies, fully synchronous and reproducible.

## Why

Picking a model per request usually means either hardcoding one model or paying
an extra LLM call just to decide. arbitro decides **offline**: a deterministic
engine classifies the prompt (task, complexity, structured-output needs) and
ranks your catalog by a tunable cost-vs-quality tradeoff. You still make the
real call yourself — arbitro only tells you which slug to send.

## Install

Published to [GitHub Packages](https://docs.github.com/en/packages) as
`@edmolima/arbitro`. Installing from GitHub Packages requires a one-time
registry setup — add this to the `.npmrc` in your project (or `~/.npmrc`):

```
@edmolima:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

`GITHUB_TOKEN` must be a GitHub personal access token with the `read:packages`
scope. Then:

```bash
npm i @edmolima/arbitro
```

New to GitHub Packages? The [consuming guide](./docs/consuming.md) walks through
token creation, `.npmrc` setup, CI usage, and common errors step by step.

## Quickstart

```ts
import { judge } from "@edmolima/arbitro";

const decision = judge("write a merge sort function in rust with tests");
// {
//   model: { slug: "deepseek/deepseek-chat", costTier: "low",
//            contextWindow: 64000, supportsStructuredOutput: false, strengths: [...] },
//   alternatives: [ { slug: "anthropic/claude-sonnet-4.5", ... }, ... ],
//   task: "code",
//   complexity: "medium",
//   needsStructuredOutput: false,
//   confidence: 0.93,
//   reason: "code/medium (confidence 0.93) → deepseek/deepseek-chat",
//   catalogVersion: "2026-07-08.1"
// }

decision.model.slug; // → the OpenRouter slug to call
```

## Tuning cost vs quality

```ts
import { createArbitro } from "@edmolima/arbitro";

const cheap = createArbitro({ costPreference: 0 });   // favor cheapest
const premium = createArbitro({ costPreference: 1 }); // favor best quality

premium.judge("write a merge sort function in rust with tests").model.slug;
// → "anthropic/claude-opus-4.1"

cheap.judge("summarize this text").model.slug;
// → a low-cost model such as "anthropic/claude-haiku-4.5"
```

Pass your own `catalog` to `createArbitro` to override the built-in model list.

## Calling the model (OpenRouter)

arbitro only *decides* — you make the real call. Since it returns an OpenRouter
model slug, sending the request is a few lines of `fetch` (no SDK needed):

```ts
import { judge, toOpenRouterBody } from "@edmolima/arbitro";

async function ask(prompt: string, apiKey = process.env.OPENROUTER_API_KEY!) {
  const decision = judge(prompt); // ← arbitro picks the model
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(toOpenRouterBody(decision, prompt)), // ← { model, messages }
  });
  const json = await res.json();
  return json.choices[0].message.content;
}
```

A runnable version lives in the playground:

```bash
OPENROUTER_API_KEY=sk-... pnpm -F playground openrouter "write a python script to parse a CSV file"
```

Without the key it prints a hint and sends nothing — safe to run in CI.

## Monorepo structure

| Path                   | What it is                                             |
| ---------------------- | ------------------------------------------------------ |
| `packages/arbitro`     | The published library — the deterministic router.      |
| `packages/eval`        | Offline evaluation harness with a CI threshold gate.   |
| `examples/playground`  | A runnable example that exercises the router.          |

## Notes

- `confidence` is a heuristic score in v1, not a calibrated probability. Treat
  it as an ordinal signal ("low → ambiguous prompt"), not `P(decision correct)`.
- The engine is 100% deterministic and offline: it never calls OpenRouter to
  decide. You make the actual model call yourself with the returned `model` slug.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). By participating you agree to the
[Code of Conduct](./CODE_OF_CONDUCT.md).

## License

[MIT](./LICENSE) © Edmo Lima
