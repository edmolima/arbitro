# API DX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve `@edmolima/arbitro`'s DX — camelCase throughout, a rich `JudgeResult` carrying full `ModelEntry` metadata, an English `reason`, and a pure `toOpenRouterBody` helper — then propagate the breaking change through eval, playground, and docs.

**Architecture:** The routing logic is unchanged; only the *types carried out* change (`pickModel` returns `ModelEntry`s instead of slugs) plus a field rename and reason-string language. A new pure helper file exposes the OpenRouter request body. Consumers update to `decision.model.slug` / `needsStructuredOutput`.

**Tech Stack:** TypeScript, tsup, vitest, pnpm workspaces.

## Global Constraints

- Package version → `0.2.0` (breaking, pre-1.0).
- Library stays offline and zero-dependency; `toOpenRouterBody` performs no I/O.
- Routing is **behavior-preserving**: the same prompt yields the same chosen slug and same ranked order as before this change. The eval metrics must be identical.
- camelCase for all public fields; `needsStructuredOutput` replaces `needs_structured_output` in the library (`packages/arbitro`). The eval package keeps its own domain key `needs_structured_output` in its dataset/`Prediction` type (not part of the library API).
- `reason` strings are English.

---

### Task 1: Rich, camelCase, English-reason result in the library core

**Files:**
- Modify: `packages/arbitro/src/types.ts`
- Modify: `packages/arbitro/src/classifier.ts`
- Modify: `packages/arbitro/src/matcher.ts`
- Modify: `packages/arbitro/src/judge.ts`
- Test: `packages/arbitro/tests/judge.test.ts`, `tests/index.test.ts`, `tests/matcher.test.ts`

**Interfaces:**
- Produces: `JudgeResult { model: ModelEntry; alternatives: ModelEntry[]; task: Task; complexity: Complexity; needsStructuredOutput: boolean; confidence: number; reason: string; catalogVersion: string }`; `Classification { task; complexity; needsStructuredOutput: boolean; confidence }`; `pickModel(c, cp, catalog): { model: ModelEntry; alternatives: ModelEntry[] }`.

- [ ] **Step 1: Update failing tests first**

`packages/arbitro/tests/judge.test.ts` — replace the file body's assertions:

```ts
import { describe, it, expect } from "vitest";
import { judgeWith } from "../src/judge";
import { DEFAULT_CATALOG } from "../src/catalog";

const run = (prompt: string, cp = 0.5) => judgeWith(prompt, cp, DEFAULT_CATALOG);

describe("judgeWith", () => {
  it("returns a full JudgeResult shape with entry-typed model", () => {
    const r = run("escreva uma função em python");
    expect(typeof r.model.slug).toBe("string");
    expect(r.model.slug.length).toBeGreaterThan(0);
    expect(["low", "medium", "high"]).toContain(r.model.costTier);
    expect(Array.isArray(r.alternatives)).toBe(true);
    expect(r.task).toBe("code");
    expect(["low", "medium", "high"]).toContain(r.complexity);
    expect(typeof r.needsStructuredOutput).toBe("boolean");
    expect(r.confidence).toBeGreaterThanOrEqual(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
    expect(r.reason.length).toBeGreaterThan(0);
    expect(r.catalogVersion).toBe(DEFAULT_CATALOG.version);
  });

  it("reason is English", () => {
    expect(run("escreva uma função em python").reason).toMatch(/confidence/);
    expect(run("   ").reason).toMatch(/trivial/i);
    expect(run("escreva uma função em python").reason).not.toMatch(/confiança|vazio|decisão/i);
  });

  it("empty prompt → trivial decision, no throw", () => {
    const r = run("   ");
    expect(r.task).toBe("chat");
    expect(r.complexity).toBe("low");
    expect(r.model.slug.length).toBeGreaterThan(0);
    expect(r.reason).toMatch(/trivial/i);
  });

  it("JSON request → structured + json_extraction", () => {
    const r = run("extraia os dados e devolva em JSON");
    expect(r.task).toBe("json_extraction");
    expect(r.needsStructuredOutput).toBe(true);
  });

  it("is deterministic", () => {
    expect(run("prove que P != NP")).toEqual(run("prove que P != NP"));
  });
});
```

`packages/arbitro/tests/index.test.ts` — update model assertions to `.slug`:
- line `expect(r.model.length).toBeGreaterThan(0);` → `expect(r.model.slug.length).toBeGreaterThan(0);`
- both `expect(cheap.model.length)...` / `expect(premium.model.length)...` → `.slug.length`
- `expect(r.model).toBe("acme/tiny");` → `expect(r.model.slug).toBe("acme/tiny");`

`packages/arbitro/tests/matcher.test.ts` — update factory + slug assertions:
- factory `needs_structured_output: false` → `needsStructuredOutput: false`
- `expect(r.model).toBe("anthropic/claude-opus-4.1");` → `expect(r.model.slug).toBe("anthropic/claude-opus-4.1");`
- `expect(r.model).toBe("anthropic/claude-haiku-4.5");` → `expect(r.model.slug).toBe(...)`
- the structured test: `needs_structured_output: true` → `needsStructuredOutput: true`; `const chosen = [r.model, ...r.alternatives];` → `const chosen = [r.model, ...r.alternatives].map((m) => m.slug);`
- the alternatives test: `expect(r.alternatives).not.toContain(r.model);` → `expect(r.alternatives.map((a) => a.slug)).not.toContain(r.model.slug);`

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm -F @edmolima/arbitro test`
Expected: FAIL (type errors / `r.model.slug` undefined — `model` is still a string).

- [ ] **Step 3: Update `types.ts`**

Replace the `Classification` and `JudgeResult` interfaces:

```ts
export interface Classification {
  task: Task;
  complexity: Complexity;
  needsStructuredOutput: boolean;
  confidence: number;
}
```

```ts
export interface JudgeResult {
  model: ModelEntry;
  alternatives: ModelEntry[];
  task: Task;
  complexity: Complexity;
  needsStructuredOutput: boolean;
  confidence: number;
  reason: string;
  catalogVersion: string;
}
```

(Leave `Signals`, `ModelEntry`, `ModelCatalog`, `ArbitroConfig`, `Task`, `Complexity`, `CostTier` unchanged. `Signals.requestsStructuredOutput` is a different field — do not touch.)

- [ ] **Step 4: Update `classifier.ts`**

Rename the field in all four returned objects: `needs_structured_output:` → `needsStructuredOutput:` (lines returning the structured case, trivial chat, ambiguous, and the final `return { task, complexity, needsStructuredOutput: false, confidence }`).

- [ ] **Step 5: Update `matcher.ts`**

Change the return type and returned values, and the structured-filter field:

```ts
export function pickModel(
  c: Classification,
  costPreference: number,
  catalog: ModelCatalog,
): { model: ModelEntry; alternatives: ModelEntry[] } {
  const cp = clamp(costPreference, 0, 1);

  let candidates = catalog.models;
  if (c.needsStructuredOutput) {
    const structured = candidates.filter((m) => m.supportsStructuredOutput);
    if (structured.length > 0) candidates = structured; // graceful fallback if none
  }

  const ranked = [...candidates].sort((a, b) => {
    const diff = score(b, c.task, c.complexity, cp) - score(a, c.task, c.complexity, cp);
    if (diff !== 0) return diff;
    return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
  });

  const winner = ranked[0];
  const fallback: ModelEntry = {
    slug: "",
    strengths: [],
    costTier: "low",
    contextWindow: 0,
    supportsStructuredOutput: false,
  };
  return {
    model: winner ?? fallback,
    alternatives: ranked.slice(1, 4),
  };
}
```

(The `fallback` preserves the old empty-catalog-safety behavior — `createArbitro` already rejects empty catalogs, so this only guards an internal edge. Keep the existing imports; `ModelEntry` is already imported.)

- [ ] **Step 6: Update `judge.ts`**

```ts
import type { Classification, JudgeResult, ModelCatalog, ModelEntry } from "./types";
import { extractSignals } from "./signals";
import { classify } from "./classifier";
import { pickModel } from "./matcher";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function buildReason(c: Classification, model: ModelEntry, isEmpty: boolean): string {
  if (isEmpty) return `empty prompt → trivial decision: ${model.slug}`;
  return `${c.task}/${c.complexity} (confidence ${c.confidence.toFixed(2)}) → ${model.slug}`;
}

export function judgeWith(
  prompt: string,
  costPreference: number,
  catalog: ModelCatalog,
): JudgeResult {
  const cp = clamp(costPreference, 0, 1);
  const isEmpty = prompt.trim().length === 0;

  const classification: Classification = isEmpty
    ? { task: "chat", complexity: "low", needsStructuredOutput: false, confidence: 0.2 }
    : classify(extractSignals(prompt));

  const { model, alternatives } = pickModel(classification, cp, catalog);

  return {
    model,
    alternatives,
    task: classification.task,
    complexity: classification.complexity,
    needsStructuredOutput: classification.needsStructuredOutput,
    confidence: classification.confidence,
    reason: buildReason(classification, model, isEmpty),
    catalogVersion: catalog.version,
  };
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `pnpm -F @edmolima/arbitro test`
Expected: PASS (all arbitro suites).

Also: `grep -rniE "needs_structured_output|confiança|vazio" packages/arbitro/src` → nothing.

- [ ] **Step 8: Commit**

```bash
git add packages/arbitro/src packages/arbitro/tests
git commit -m "feat!: rich entry-typed JudgeResult, camelCase, English reason

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Add the `toOpenRouterBody` helper

**Files:**
- Create: `packages/arbitro/src/openrouter.ts`
- Modify: `packages/arbitro/src/index.ts`
- Test: `packages/arbitro/tests/openrouter.test.ts`

**Interfaces:**
- Consumes: `JudgeResult` from Task 1.
- Produces: `toOpenRouterBody(decision: JudgeResult, prompt: string): OpenRouterBody`; `OpenRouterBody { model: string; messages: OpenRouterMessage[] }`; `OpenRouterMessage { role: "user" | "system" | "assistant"; content: string }`.

- [ ] **Step 1: Write the failing test**

`packages/arbitro/tests/openrouter.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F @edmolima/arbitro test openrouter`
Expected: FAIL (`toOpenRouterBody` is not exported).

- [ ] **Step 3: Create `openrouter.ts`**

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

- [ ] **Step 4: Export from `index.ts`**

Add after the existing `export { DEFAULT_CATALOG } from "./catalog";` line:

```ts
export { toOpenRouterBody } from "./openrouter";
export type { OpenRouterBody, OpenRouterMessage } from "./openrouter";
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm -F @edmolima/arbitro test`
Expected: PASS (all suites incl. openrouter).

- [ ] **Step 6: Commit**

```bash
git add packages/arbitro/src/openrouter.ts packages/arbitro/src/index.ts packages/arbitro/tests/openrouter.test.ts
git commit -m "feat: add pure toOpenRouterBody helper

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Update consumers (eval + playground)

**Files:**
- Modify: `packages/eval/src/runner.ts`
- Modify: `examples/playground/src/batch.ts`, `examples/playground/src/index.ts`, `examples/playground/src/openrouter.ts`
- Test: `examples/playground/tests/openrouter.test.ts`

(`packages/eval/src/report.ts`, `eval/tests/runner.test.ts`, `playground/tests/batch.test.ts` need **no** change — they read the string `Prediction.model` / `BatchRow.model`, which stay strings.)

**Interfaces:**
- Consumes: `JudgeResult` (Task 1) and `toOpenRouterBody` (Task 2).

- [ ] **Step 1: Update `eval/src/runner.ts`**

Inside `dataset.cases.map`, change the three reads of the decision:

```ts
    const d = arbitro.judge(c.prompt);
    const tier = SLUG_TIER[d.model.slug];
    if (tier === undefined) {
      throw new Error(`arbitro returned model "${d.model.slug}" not present in DEFAULT_CATALOG`);
    }
    return {
      id: c.id,
      task: d.task,
      complexity: d.complexity,
      needs_structured_output: d.needsStructuredOutput,
      model: d.model.slug,
      tier,
    };
```

(The `Prediction.needs_structured_output` key and `model: string` are eval's domain shape — unchanged; only the source values now come from `d.model.slug` / `d.needsStructuredOutput`.)

- [ ] **Step 2: Update `playground/src/batch.ts`**

Change the mapped row's model to the slug:

```ts
    return {
      prompt,
      model: d.model.slug,
      task: d.task,
      complexity: d.complexity,
      confidence: d.confidence,
    };
```

- [ ] **Step 3: Update `playground/src/index.ts`**

In the REPL output block, use slugs:

```ts
    const d = createArbitro({ costPreference }).judge(input);
    console.log(
      `\n  model:        ${d.model.slug}\n` +
        `  alternatives: ${d.alternatives.map((a) => a.slug).join(", ") || "(none)"}\n` +
        `  task:         ${d.task}    complexity: ${d.complexity}    confidence: ${d.confidence.toFixed(2)}\n` +
        `  reason:       ${d.reason}\n`,
    );
```

- [ ] **Step 4: Update `playground/src/openrouter.ts` to reuse the library helper**

Change the import and `buildRequest` body construction:

```ts
import { judge, toOpenRouterBody, type JudgeResult } from "@edmolima/arbitro";
```

```ts
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
    body: JSON.stringify(toOpenRouterBody(decision, prompt)),
  };
}
```

(Keep `OPENROUTER_URL`, `OpenRouterRequest`, `ask`, and the CLI entry as-is. `ask` still calls `judge` internally and prints `decision.model` — update its log line to `decision.model.slug`.)

In the CLI block, change the log:

```ts
      console.log(
        `\narbitro → ${decision.model.slug}  (${decision.task}/${decision.complexity})\n`,
      );
```

- [ ] **Step 5: Update `playground/tests/openrouter.test.ts`**

Three assertions reference `decision.model` (now an entry object) — change each to `.slug`:
- `expect(body.model).toBe(decision.model);` → `expect(body.model).toBe(decision.model.slug);`
- `expect(JSON.parse(init.body).model).toBe(decision.model);` → `.toBe(decision.model.slug);`
- `expect(decision.model).toBe(judge(PROMPT).model);` → `expect(decision.model.slug).toBe(judge(PROMPT).model.slug);` (avoid object-identity comparison)

(The `import { judge } from "@edmolima/arbitro"` and the stubbed-fetch mechanics stay.)

- [ ] **Step 6: Build the library, then run consumer tests**

Run: `pnpm -F @edmolima/arbitro build && pnpm -F @arbitro/eval test && pnpm -F playground test`
Expected: PASS.

Run: `pnpm typecheck`
Expected: all three packages Done.

- [ ] **Step 7: Commit**

```bash
git add packages/eval/src/runner.ts examples/playground/src examples/playground/tests
git commit -m "refactor: update eval + playground to entry-typed result and shared body helper

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Docs, changelog, version bump

**Files:**
- Modify: `README.md`, `packages/arbitro/README.md`, `CHANGELOG.md`, `packages/arbitro/package.json`

- [ ] **Step 1: Bump version**

`packages/arbitro/package.json`: `"version": "0.1.0"` → `"version": "0.2.0"`.

- [ ] **Step 2: Update root `README.md` Quickstart result comment**

Replace the `judge(...)` result comment block so it reflects the entry-typed shape and camelCase:

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

In the "Calling the model (OpenRouter)" section, replace the hand-built body with the helper:

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

Update the premium/cheap tuning example's trailing comments if they reference `.model` directly: `premium.judge("...").model` → `premium.judge("...").model.slug`.

- [ ] **Step 3: Update `packages/arbitro/README.md`**

Apply the same result-comment update (entry-typed `model`, `needsStructuredOutput`, English reason) and change the tuning examples `.model` → `.model.slug`.

- [ ] **Step 4: Add CHANGELOG entry**

Under `## [Unreleased]`, add:

```markdown
## [0.2.0] - 2026-07-09

### Changed

- **Breaking:** `JudgeResult.model` and `JudgeResult.alternatives` are now full
  `ModelEntry` objects instead of slug strings. Use `decision.model.slug` for the
  OpenRouter call.
- **Breaking:** `JudgeResult.needs_structured_output` renamed to
  `needsStructuredOutput` (camelCase, consistent with the rest of the API).
- `reason` strings are now in English.

### Added

- `toOpenRouterBody(decision, prompt)` — a pure helper that builds the
  OpenRouter (OpenAI-compatible) chat-completion request body.
```

Also add the compare/tag links at the bottom:
`[0.2.0]: https://github.com/edmolima/arbitro/compare/v0.1.0...v0.2.0` and update `[Unreleased]` to `compare/v0.2.0...HEAD`.

- [ ] **Step 5: Verify docs have no stale references**

Run: `grep -rniE "needs_structured_output|npm i arbitro\"|from \"arbitro\"" README.md packages/arbitro/README.md || echo CLEAN`
Expected: `CLEAN`.

- [ ] **Step 6: Commit**

```bash
git add README.md packages/arbitro/README.md CHANGELOG.md packages/arbitro/package.json
git commit -m "docs: document 0.2.0 API and bump version

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Full-pipeline + behavior-preservation verification

- [ ] **Step 1: Run the whole gate**

Run: `pnpm build && pnpm typecheck && pnpm test && pnpm eval`
Expected: all pass.

- [ ] **Step 2: Confirm routing is behavior-preserving**

The eval output must match the pre-refactor numbers exactly:
- task accuracy `69.4%`, complexity `79.6%`, structured `95.9%`, recall `100.0%`,
  macro-F1 `0.752`, under-provision `32.7%`, over-provision `0.0%`,
  tier weighted error `0.653`, simulated cost `69`, savings `94.4%`, `PASS`.

If any metric differs, the refactor changed behavior — stop and diff `matcher.ts`
against the original ranking logic.

- [ ] **Step 3: Final source audit**

Run: `grep -rniE "needs_structured_output|confiança" packages/arbitro/src examples || echo CLEAN`
Expected: `CLEAN` (eval keeps its own domain key; not scanned here).
