# arbitro

Deterministic model router. Given a prompt, it tells you the **best OpenRouter model**
to use — before you spend the call. No network, no dependencies, fully synchronous and
reproducible.

## Install

```bash
npm i arbitro
```

## Usage

```ts
import { judge } from "arbitro";

const decision = judge("escreva uma função de merge sort em rust com testes");
// {
//   model: "anthropic/claude-opus-4.1",
//   alternatives: ["google/gemini-2.5-pro", "openai/o3", ...],
//   task: "code",
//   complexity: "high",
//   needs_structured_output: false,
//   confidence: 0.78,
//   reason: "code/high (confiança 0.78) → anthropic/claude-opus-4.1",
//   catalogVersion: "2026-07-08.1"
// }
```

### Tuning cost vs quality

```ts
import { createArbitro } from "arbitro";

const cheap = createArbitro({ costPreference: 0 });   // favor cheapest
const premium = createArbitro({ costPreference: 1 }); // favor best quality
cheap.judge("resuma este texto");
```

### Custom catalog

Pass your own `catalog` to `createArbitro` to override the built-in model list.

## Notes

- **`confidence` is a heuristic score in v1**, not a calibrated probability. Treat it as an
  ordinal signal ("low → ambiguous prompt"), not as `P(decision correct)`. Calibration is
  on the roadmap.
- The engine is 100% deterministic and offline: it never calls OpenRouter to decide. You
  make the actual model call yourself with the returned `model` slug.
