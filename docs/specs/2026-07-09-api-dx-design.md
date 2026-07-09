# API Redesign for DX — Design Spec

**Date:** 2026-07-09
**Status:** Approved
**Package:** `@edmolima/arbitro` · **Version:** 0.1.0 → **0.2.0** (breaking, pre-1.0)

## Goal

Improve the developer experience of arbitro's public API: consistent casing, a
richer result that carries the chosen model's metadata, an English `reason`
string (matching the rest of the library), and a pure helper that closes the
"last mile" of calling OpenRouter.

## Non-Goals (YAGNI)

- Named `costPreference` presets (`"cheapest" | "balanced" | "best"`).
- Batch API (`judgeMany`).
- Changes to `ArbitroConfig` or `createArbitro`/`judge` signatures.
- Any network I/O in the library (stays offline, zero-dependency).

## 1. `JudgeResult` shape

```ts
export interface JudgeResult {
  model: ModelEntry;              // was `string` (slug)
  alternatives: ModelEntry[];     // was `string[]`
  task: Task;
  complexity: Complexity;
  needsStructuredOutput: boolean; // was `needs_structured_output`
  confidence: number;
  reason: string;                 // now English
  catalogVersion: string;
}
```

- `model` / `alternatives` become full `ModelEntry` objects (`slug`, `strengths`,
  `costTier`, `contextWindow`, `supportsStructuredOutput`). To make the API call,
  use `decision.model.slug`.
- `needs_structured_output` → `needsStructuredOutput` (camelCase, consistent with
  `catalogVersion`, `costPreference`).

**`reason` (English):**
- Normal: `` `${task}/${complexity} (confidence ${confidence.toFixed(2)}) → ${slug}` ``
- Empty prompt: `` `empty prompt → trivial decision: ${slug}` ``

**Acceptance:** `judge("...").model` is a `ModelEntry`; `.needsStructuredOutput`
exists; `.reason` contains no Portuguese (no "confiança"/"vazio"/"decisão").

## 2. Internals: `pickModel` returns entries

`src/matcher.ts` `pickModel` currently returns `{ model: string; alternatives:
string[] }`. It changes to `{ model: ModelEntry; alternatives: ModelEntry[] }`
(it already iterates over catalog entries to rank them, so it returns the entries
instead of mapping to `.slug`). `src/judge.ts` `judgeWith` passes them through and
builds `reason` from `model.slug`. No behavioral change to *which* model is picked
or the ranking order — only the value type carried out.

**Acceptance:** ranking order for every existing test prompt is unchanged (same
slugs, same order); only the wrapping type differs.

## 3. New helper: `toOpenRouterBody`

New file `src/openrouter.ts`:

```ts
import type { JudgeResult } from "./types";

export interface OpenRouterMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

export interface OpenRouterBody {
  model: string;
  messages: OpenRouterMessage[];
}

// Pure — no network. Turns a routing decision + prompt into the JSON body for an
// OpenRouter (OpenAI-compatible) chat-completion request.
export function toOpenRouterBody(decision: JudgeResult, prompt: string): OpenRouterBody {
  return {
    model: decision.model.slug,
    messages: [{ role: "user", content: prompt }],
  };
}
```

**Acceptance:** `toOpenRouterBody(judge(p), p).model === judge(p).model.slug`;
messages is a single user message with `p`; function performs no I/O.

## 4. Exported surface (`src/index.ts`)

Add:
- `export { toOpenRouterBody } from "./openrouter";`
- `export type { OpenRouterBody, OpenRouterMessage } from "./openrouter";`

Unchanged: `judge`, `createArbitro`, `DEFAULT_CATALOG`, and the existing type
exports (`Task`, `Complexity`, `CostTier`, `ModelEntry`, `ModelCatalog`,
`JudgeResult`, `ArbitroConfig`). `Classification`/`Signals` stay internal.

## 5. Consumer ripple (same change)

- **`packages/eval`:** `runner.ts` and `report.ts` read `decision.model` (slug) and
  `needs_structured_output`. Update to `decision.model.slug` and
  `needsStructuredOutput`. Verify against tests + the eval gate.
- **`examples/playground`:** `batch.ts` (`model: d.model` → `d.model.slug`),
  `index.ts` (`d.model`, `d.alternatives.join` → `.slug` / `.map(a => a.slug)`).
  `openrouter.ts` drops its local body construction and uses the library's
  `toOpenRouterBody`; `buildRequest` keeps building headers/url around it.
- **Docs:** root `README.md` and `packages/arbitro/README.md` — update the result
  comment block (object shape, `needsStructuredOutput`), the OpenRouter section to
  use `toOpenRouterBody`, and any `decision.model` → `decision.model.slug`.
- **Versioning:** bump `packages/arbitro/package.json` to `0.2.0`; add a
  `## [0.2.0]` section to `CHANGELOG.md` documenting the breaking result shape,
  the rename, the English `reason`, and the new `toOpenRouterBody` export.

## 6. Testing

- **arbitro:** update `tests/judge.test.ts`, `tests/index.test.ts`,
  `tests/matcher.test.ts` for the entry-typed result and camelCase field. Add
  `tests/openrouter.test.ts` for `toOpenRouterBody`. Add an assertion that `reason`
  is English (matches `/confidence/`, does not match `/confiança|vazio|decisão/`).
- **eval / playground:** update asserts touching `.model` / `needs_structured_output`.

## 7. Verification (whole change)

1. `pnpm build && pnpm typecheck && pnpm test && pnpm eval` all pass.
2. Eval metrics (accuracy, tier error, savings) are unchanged from before the
   refactor — the routing is behavior-preserving.
3. `grep -rniE "needs_structured_output|confiança" packages examples` returns nothing
   in source (docs/spec history excepted).
