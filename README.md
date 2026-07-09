# arbitro

[![CI](https://github.com/edmolima/arbitro/actions/workflows/ci.yml/badge.svg)](https://github.com/edmolima/arbitro/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

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

```bash
npm i arbitro
```

## Quickstart

```ts
import { judge } from "arbitro";

const decision = judge("write a merge sort function in rust with tests");
// {
//   model: "deepseek/deepseek-chat",
//   alternatives: [
//     "anthropic/claude-sonnet-4.5",
//     "openai/gpt-4o",
//     "anthropic/claude-haiku-4.5"
//   ],
//   task: "code",
//   complexity: "medium",
//   needs_structured_output: false,
//   confidence: 0.93,
//   reason: "code/medium (confidence 0.93) → deepseek/deepseek-chat",
//   catalogVersion: "2026-07-08.1"
// }
```

## Tuning cost vs quality

```ts
import { createArbitro } from "arbitro";

const cheap = createArbitro({ costPreference: 0 });   // favor cheapest
const premium = createArbitro({ costPreference: 1 }); // favor best quality

premium.judge("write a merge sort function in rust with tests").model;
// → "anthropic/claude-opus-4.1"

cheap.judge("summarize this text").model;
// → a low-cost model such as "anthropic/claude-haiku-4.5"
```

Pass your own `catalog` to `createArbitro` to override the built-in model list.

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
