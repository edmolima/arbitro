# arbitro

Deterministic model router. Given a prompt, it tells you the **best OpenRouter model**
to use — before you spend the call. No network, no dependencies, fully synchronous and
reproducible.

## Install

Published to GitHub Packages. Add to your project's `.npmrc`:

```
@edmolima:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

(`GITHUB_TOKEN` = a personal access token with `read:packages`.) Then:

```bash
npm i @edmolima/arbitro
```

## Usage

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

The default balances cost and quality (`costPreference: 0.5`), so a coding task routes to a
cheap-but-strong model. Ask for quality and the same prompt upgrades:

### Tuning cost vs quality

```ts
import { createArbitro } from "@edmolima/arbitro";

const cheap = createArbitro({ costPreference: 0 });   // favor cheapest
const premium = createArbitro({ costPreference: 1 }); // favor best quality

premium.judge("write a merge sort function in rust with tests").model.slug;
// → "anthropic/claude-opus-4.1"

cheap.judge("summarize this text").model.slug;
// → a low-cost model such as "anthropic/claude-haiku-4.5"
```

### Custom catalog

Pass your own `catalog` to `createArbitro` to override the built-in model list.

## Notes

- **`confidence` is a heuristic score in v1**, not a calibrated probability. Treat it as an
  ordinal signal ("low → ambiguous prompt"), not as `P(decision correct)`. Calibration is
  on the roadmap.
- The engine is 100% deterministic and offline: it never calls OpenRouter to decide. You
  make the actual model call yourself with the returned `model` slug.
