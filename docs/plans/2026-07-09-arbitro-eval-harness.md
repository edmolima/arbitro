# Arbitro Eval Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a private `packages/eval` that measures the `arbitro` router's decision quality against a frozen labeled dataset and gates CI on regression.

**Architecture:** A pure pipeline `dataset → runner.predict (imports arbitro) → report.evaluate (metrics) → checkThresholds → CLI exit code`. The evaluator is offline and deterministic (frozen JSON dataset). A separate offline script synthesizes the dataset via OpenRouter (dev-only, never in CI). Metrics are pure functions tested with inline fixtures; the real dataset is consumed only by the `pnpm eval` CLI.

**Tech Stack:** TypeScript (strict), pnpm workspaces, vitest, tsx. No runtime dependencies (native `fetch` only, and only in the generation script).

## Global Constraints

- **`packages/eval` is private** (`"private": true`) — never published.
- **No runtime dependencies** beyond the workspace `arbitro` dep; native `fetch` only (generation script).
- **Evaluator + CI are offline and deterministic:** no network, no `Date`/random in `runner`/`report`/`metrics`/`index`. The frozen `dataset/cases.json` is the only decision input.
- **Reuse `arbitro`'s exported types** (`Task`, `Complexity`, `CostTier`) and `DEFAULT_CATALOG` — do not redefine them.
- **`Task` enum (exact):** `"chat" | "summary" | "code" | "research" | "json_extraction" | "translation"`.
- **`Complexity`/`CostTier` enum (exact):** `"low" | "medium" | "high"`.
- **Tier cost proxy (exact):** `{ low: 1, medium: 5, high: 25 }`.
- **`lang` values (exact):** `"pt" | "en"`.
- **TypeScript:** `strict: true` + `noUncheckedIndexedAccess` (inherited from `tsconfig.base.json`).
- **Tests use inline fixtures, not `cases.json`** — so they don't break as the dataset grows.
- **The generation script is dev-only:** not run in CI, not a dependency of the evaluator, not covered by the unit suite.

---

### Task 1: Scaffold `packages/eval`

**Files:**
- Create: `packages/eval/package.json`
- Create: `packages/eval/tsconfig.json`
- Create: `packages/eval/src/index.ts` (temporary smoke export)
- Test: `packages/eval/tests/smoke.test.ts`

**Interfaces:**
- Consumes: the existing workspace (`pnpm-workspace.yaml` already globs `packages/*`) and the built `arbitro` package.
- Produces: a working package where `pnpm -F @arbitro/eval test` and `pnpm -F @arbitro/eval typecheck` pass, and `arbitro` resolves as a workspace dependency.

- [ ] **Step 1: Create `packages/eval/package.json`**

`packages/eval/package.json`:
```json
{
  "name": "@arbitro/eval",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "eval": "tsx src/index.ts",
    "generate": "tsx scripts/generate.ts",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "pretest": "pnpm -F arbitro build",
    "preeval": "pnpm -F arbitro build"
  },
  "dependencies": {
    "arbitro": "workspace:*"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "vitest": "^2.1.0",
    "typescript": "^5.6.0",
    "@types/node": "^22.10.0"
  }
}
```

- [ ] **Step 2: Create `packages/eval/tsconfig.json`**

`packages/eval/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true
  },
  "include": ["src", "tests", "scripts"]
}
```

- [ ] **Step 3: Create temporary smoke export**

`packages/eval/src/index.ts`:
```typescript
export const EVAL_PACKAGE = "@arbitro/eval";
```

- [ ] **Step 4: Write the smoke test**

`packages/eval/tests/smoke.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { EVAL_PACKAGE } from "../src/index";

describe("scaffold", () => {
  it("exports the package marker", () => {
    expect(EVAL_PACKAGE).toBe("@arbitro/eval");
  });
});
```

- [ ] **Step 5: Install and verify**

Run:
```bash
pnpm install
pnpm -F @arbitro/eval test
pnpm -F @arbitro/eval typecheck
```
Expected: `pnpm install` links `arbitro` into `packages/eval/node_modules`; 1 test passes; typecheck clean.

- [ ] **Step 6: Commit**

```bash
git add packages/eval/package.json packages/eval/tsconfig.json packages/eval/src/index.ts packages/eval/tests/smoke.test.ts pnpm-lock.yaml
git commit -m "chore: scaffold @arbitro/eval package"
```

---

### Task 2: Dataset types, schema validation, and bootstrap dataset

**Files:**
- Create: `packages/eval/src/types.ts`
- Create: `packages/eval/src/dataset-schema.ts`
- Create: `packages/eval/dataset/cases.json` (small bootstrap; grown later in Task 7)
- Test: `packages/eval/tests/dataset-schema.test.ts`

**Interfaces:**
- Consumes: `Task`, `Complexity`, `CostTier` from `arbitro`.
- Produces:
  - `interface EvalCase { id: string; prompt: string; lang: "pt" | "en"; expected: { task: Task; complexity: Complexity; needs_structured_output: boolean; tier: CostTier }; tags: string[] }`
  - `interface EvalDataset { version: string; cases: EvalCase[] }`
  - `interface Prediction { id: string; task: Task; complexity: Complexity; needs_structured_output: boolean; model: string; tier: CostTier }`
  - `function validateDataset(data: unknown): { valid: boolean; errors: string[] }`

- [ ] **Step 1: Write `types.ts`**

`packages/eval/src/types.ts`:
```typescript
import type { Task, Complexity, CostTier } from "arbitro";

export interface EvalCase {
  id: string;
  prompt: string;
  lang: "pt" | "en";
  expected: {
    task: Task;
    complexity: Complexity;
    needs_structured_output: boolean;
    tier: CostTier;
  };
  tags: string[];
}

export interface EvalDataset {
  version: string;
  cases: EvalCase[];
}

export interface Prediction {
  id: string;
  task: Task;
  complexity: Complexity;
  needs_structured_output: boolean;
  model: string;
  tier: CostTier;
}
```

- [ ] **Step 2: Write the failing schema test**

`packages/eval/tests/dataset-schema.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { validateDataset } from "../src/dataset-schema";

const validCase = {
  id: "code-001",
  prompt: "escreva uma função em rust",
  lang: "pt",
  expected: { task: "code", complexity: "medium", needs_structured_output: false, tier: "medium" },
  tags: ["code", "pt"],
};

describe("validateDataset", () => {
  it("accepts a well-formed dataset", () => {
    const r = validateDataset({ version: "test.1", cases: [validCase] });
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it("rejects a non-object / missing cases array", () => {
    expect(validateDataset(null).valid).toBe(false);
    expect(validateDataset({ version: "x" }).valid).toBe(false);
  });

  it("rejects an invalid task enum", () => {
    const bad = { ...validCase, expected: { ...validCase.expected, task: "poetry" } };
    const r = validateDataset({ version: "x", cases: [bad] });
    expect(r.valid).toBe(false);
    expect(r.errors.join(" ")).toMatch(/task/);
  });

  it("rejects an invalid tier / complexity / lang", () => {
    const badTier = { ...validCase, expected: { ...validCase.expected, tier: "ultra" } };
    const badLang = { ...validCase, lang: "fr" };
    expect(validateDataset({ version: "x", cases: [badTier] }).valid).toBe(false);
    expect(validateDataset({ version: "x", cases: [badLang] }).valid).toBe(false);
  });

  it("rejects duplicate ids", () => {
    const r = validateDataset({ version: "x", cases: [validCase, validCase] });
    expect(r.valid).toBe(false);
    expect(r.errors.join(" ")).toMatch(/duplicate/i);
  });

  it("rejects a missing required field", () => {
    const noPrompt = { ...validCase } as Record<string, unknown>;
    delete noPrompt.prompt;
    expect(validateDataset({ version: "x", cases: [noPrompt] }).valid).toBe(false);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm -F @arbitro/eval test dataset-schema`
Expected: FAIL — cannot find module `../src/dataset-schema`.

- [ ] **Step 4: Write `dataset-schema.ts`**

`packages/eval/src/dataset-schema.ts`:
```typescript
import type { Task, Complexity, CostTier } from "arbitro";

const TASKS: Task[] = ["chat", "summary", "code", "research", "json_extraction", "translation"];
const COMPLEXITIES: Complexity[] = ["low", "medium", "high"];
const TIERS: CostTier[] = ["low", "medium", "high"];
const LANGS = ["pt", "en"];

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function validateDataset(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!isObject(data)) return { valid: false, errors: ["dataset is not an object"] };
  if (typeof data.version !== "string") errors.push("version must be a string");
  if (!Array.isArray(data.cases)) return { valid: false, errors: [...errors, "cases must be an array"] };

  const seenIds = new Set<string>();
  data.cases.forEach((c, i) => {
    const where = `case[${i}]`;
    if (!isObject(c)) {
      errors.push(`${where} is not an object`);
      return;
    }
    if (typeof c.id !== "string" || c.id.length === 0) errors.push(`${where}.id must be a non-empty string`);
    else if (seenIds.has(c.id)) errors.push(`${where}.id duplicate: ${c.id}`);
    else seenIds.add(c.id);

    if (typeof c.prompt !== "string" || c.prompt.length === 0) errors.push(`${where}.prompt must be a non-empty string`);
    if (typeof c.lang !== "string" || !LANGS.includes(c.lang)) errors.push(`${where}.lang invalid`);
    if (!Array.isArray(c.tags)) errors.push(`${where}.tags must be an array`);

    const e = c.expected;
    if (!isObject(e)) {
      errors.push(`${where}.expected is not an object`);
      return;
    }
    if (!TASKS.includes(e.task as Task)) errors.push(`${where}.expected.task invalid: ${String(e.task)}`);
    if (!COMPLEXITIES.includes(e.complexity as Complexity)) errors.push(`${where}.expected.complexity invalid: ${String(e.complexity)}`);
    if (typeof e.needs_structured_output !== "boolean") errors.push(`${where}.expected.needs_structured_output must be boolean`);
    if (!TIERS.includes(e.tier as CostTier)) errors.push(`${where}.expected.tier invalid: ${String(e.tier)}`);
  });

  return { valid: errors.length === 0, errors };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm -F @arbitro/eval test dataset-schema`
Expected: PASS.

- [ ] **Step 6: Create the bootstrap dataset**

Create `packages/eval/dataset/cases.json` with a small, hand-verified seed (18 cases spanning tasks, both languages, and the trivial/ambiguous cases). Task 7 expands this via the generation script.

`packages/eval/dataset/cases.json`:
```json
{
  "version": "2026-07-09.bootstrap",
  "cases": [
    { "id": "chat-001", "prompt": "oi, tudo bem?", "lang": "pt", "expected": { "task": "chat", "complexity": "low", "needs_structured_output": false, "tier": "low" }, "tags": ["chat", "trivial", "pt"] },
    { "id": "chat-002", "prompt": "hello, how are you?", "lang": "en", "expected": { "task": "chat", "complexity": "low", "needs_structured_output": false, "tier": "low" }, "tags": ["chat", "trivial", "en"] },
    { "id": "chat-003", "prompt": "me ajuda com isso aqui por favor", "lang": "pt", "expected": { "task": "chat", "complexity": "medium", "needs_structured_output": false, "tier": "medium" }, "tags": ["chat", "ambiguous", "pt"] },
    { "id": "summary-001", "prompt": "resuma este relatório técnico de rede em 3 linhas", "lang": "pt", "expected": { "task": "summary", "complexity": "medium", "needs_structured_output": false, "tier": "low" }, "tags": ["summary", "pt"] },
    { "id": "summary-002", "prompt": "summarize this article about databases", "lang": "en", "expected": { "task": "summary", "complexity": "medium", "needs_structured_output": false, "tier": "low" }, "tags": ["summary", "en"] },
    { "id": "translation-001", "prompt": "traduza este parágrafo para o inglês", "lang": "pt", "expected": { "task": "translation", "complexity": "medium", "needs_structured_output": false, "tier": "low" }, "tags": ["translation", "pt"] },
    { "id": "translation-002", "prompt": "translate this document to spanish", "lang": "en", "expected": { "task": "translation", "complexity": "medium", "needs_structured_output": false, "tier": "low" }, "tags": ["translation", "en"] },
    { "id": "code-001", "prompt": "escreva uma função de merge sort em rust com testes", "lang": "pt", "expected": { "task": "code", "complexity": "medium", "needs_structured_output": false, "tier": "medium" }, "tags": ["code", "pt"] },
    { "id": "code-002", "prompt": "write a python script to read a file line by line", "lang": "en", "expected": { "task": "code", "complexity": "medium", "needs_structured_output": false, "tier": "medium" }, "tags": ["code", "en"] },
    { "id": "code-003", "prompt": "refatore este algoritmo recursivo para uma versão iterativa", "lang": "pt", "expected": { "task": "code", "complexity": "medium", "needs_structured_output": false, "tier": "medium" }, "tags": ["code", "pt"] },
    { "id": "research-001", "prompt": "prove que este algoritmo distribuído é livre de deadlock", "lang": "pt", "expected": { "task": "research", "complexity": "high", "needs_structured_output": false, "tier": "high" }, "tags": ["research", "pt"] },
    { "id": "research-002", "prompt": "analise a fundo os trade-offs de arquitetura de software para um sistema distribuído de alta escala", "lang": "pt", "expected": { "task": "research", "complexity": "high", "needs_structured_output": false, "tier": "high" }, "tags": ["research", "pt"] },
    { "id": "research-003", "prompt": "demonstre em detalhes o teorema fundamental do cálculo", "lang": "pt", "expected": { "task": "research", "complexity": "high", "needs_structured_output": false, "tier": "high" }, "tags": ["research", "pt"] },
    { "id": "json-001", "prompt": "extraia nome e email deste texto e devolva em JSON", "lang": "pt", "expected": { "task": "json_extraction", "complexity": "low", "needs_structured_output": true, "tier": "low" }, "tags": ["json_extraction", "structured", "pt"] },
    { "id": "json-002", "prompt": "gere uma tabela com os endpoints e seus métodos HTTP", "lang": "pt", "expected": { "task": "json_extraction", "complexity": "low", "needs_structured_output": true, "tier": "low" }, "tags": ["json_extraction", "structured", "pt"] },
    { "id": "json-003", "prompt": "return the parsed fields as a JSON object with keys name and age", "lang": "en", "expected": { "task": "json_extraction", "complexity": "low", "needs_structured_output": true, "tier": "low" }, "tags": ["json_extraction", "structured", "en"] },
    { "id": "chat-004", "prompt": "obrigado pela ajuda!", "lang": "pt", "expected": { "task": "chat", "complexity": "low", "needs_structured_output": false, "tier": "low" }, "tags": ["chat", "trivial", "pt"] },
    { "id": "summary-003", "prompt": "faça um tl;dr deste texto longo sobre economia", "lang": "pt", "expected": { "task": "summary", "complexity": "medium", "needs_structured_output": false, "tier": "low" }, "tags": ["summary", "pt"] }
  ]
}
```

- [ ] **Step 7: Add a test asserting the committed dataset is valid**

Append to `packages/eval/tests/dataset-schema.test.ts`:
```typescript
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

describe("committed cases.json", () => {
  it("is a valid dataset", () => {
    const path = fileURLToPath(new URL("../dataset/cases.json", import.meta.url));
    const data = JSON.parse(readFileSync(path, "utf8"));
    const r = validateDataset(data);
    expect(r.errors).toEqual([]);
    expect(r.valid).toBe(true);
    expect(data.cases.length).toBeGreaterThanOrEqual(15);
  });
});
```

- [ ] **Step 8: Run tests to verify all pass**

Run: `pnpm -F @arbitro/eval test dataset-schema`
Expected: PASS (schema cases + committed-dataset validity).

- [ ] **Step 9: Commit**

```bash
git add packages/eval/src/types.ts packages/eval/src/dataset-schema.ts packages/eval/dataset/cases.json packages/eval/tests/dataset-schema.test.ts
git commit -m "feat: add eval dataset types, schema validation, and bootstrap dataset"
```

---

### Task 3: Metrics (pure functions)

**Files:**
- Create: `packages/eval/src/metrics.ts`
- Test: `packages/eval/tests/metrics.test.ts`

**Interfaces:**
- Consumes: `CostTier` from `arbitro` (type only).
- Produces:
  - `function accuracy(expected: string[], predicted: string[]): number`
  - `function macroF1(expected: string[], predicted: string[], labels: string[]): number`
  - `interface Confusion { labels: string[]; matrix: Record<string, Record<string, number>> }`
  - `function confusion(expected: string[], predicted: string[], labels: string[]): Confusion`
  - `const TIER_COST: Record<CostTier, number>` = `{ low: 1, medium: 5, high: 25 }`
  - `function simulatedCost(tiers: CostTier[]): number`
  - `function alwaysPremiumCost(n: number): number`
  - `interface TierError { underProvisionRate: number; overProvisionRate: number; weightedError: number }`
  - `function tierError(expected: CostTier[], predicted: CostTier[]): TierError`

- [ ] **Step 1: Write the failing test**

`packages/eval/tests/metrics.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import {
  accuracy,
  macroF1,
  confusion,
  simulatedCost,
  alwaysPremiumCost,
  tierError,
  TIER_COST,
} from "../src/metrics";
import type { CostTier } from "arbitro";

describe("accuracy", () => {
  it("is the fraction of exact matches", () => {
    expect(accuracy(["a", "b", "c", "d"], ["a", "b", "x", "d"])).toBe(0.75);
  });
  it("is 1 for empty input (vacuously)", () => {
    expect(accuracy([], [])).toBe(1);
  });
});

describe("macroF1", () => {
  it("is 1 for a perfect prediction", () => {
    expect(macroF1(["a", "b", "a"], ["a", "b", "a"], ["a", "b"])).toBe(1);
  });
  it("averages per-class F1, counting a never-predicted class as 0", () => {
    // expected has a,b,c; predictions get a right, b right, c wrong (predicted a)
    const f1 = macroF1(["a", "b", "c"], ["a", "b", "a"], ["a", "b", "c"]);
    // class a: tp=1, fp=1, fn=0 → P=0.5 R=1 F1=0.667; b: perfect F1=1; c: tp=0 → F1=0
    expect(f1).toBeCloseTo((2 / 3 + 1 + 0) / 3, 5);
  });
});

describe("confusion", () => {
  it("counts expected→predicted pairs over the given labels", () => {
    const c = confusion(["a", "a", "b"], ["a", "b", "b"], ["a", "b"]);
    expect(c.matrix.a.a).toBe(1);
    expect(c.matrix.a.b).toBe(1);
    expect(c.matrix.b.b).toBe(1);
    expect(c.matrix.b.a).toBe(0);
  });
});

describe("cost simulation", () => {
  it("sums the tier cost proxy", () => {
    const tiers: CostTier[] = ["low", "medium", "high"];
    expect(simulatedCost(tiers)).toBe(TIER_COST.low + TIER_COST.medium + TIER_COST.high);
    expect(simulatedCost(tiers)).toBe(1 + 5 + 25);
  });
  it("always-premium cost is n * high tier", () => {
    expect(alwaysPremiumCost(3)).toBe(3 * TIER_COST.high);
  });
});

describe("tierError", () => {
  it("separates under- and over-provisioning", () => {
    // expected: [high, low, medium], predicted: [medium, low, high]
    // case 0: predicted below expected → under; case 1: exact; case 2: predicted above → over
    const e: CostTier[] = ["high", "low", "medium"];
    const p: CostTier[] = ["medium", "low", "high"];
    const r = tierError(e, p);
    expect(r.underProvisionRate).toBeCloseTo(1 / 3, 5);
    expect(r.overProvisionRate).toBeCloseTo(1 / 3, 5);
    expect(r.weightedError).toBeGreaterThan(0);
  });
  it("is zero error for exact tier matches", () => {
    const t: CostTier[] = ["low", "medium", "high"];
    const r = tierError(t, t);
    expect(r.underProvisionRate).toBe(0);
    expect(r.overProvisionRate).toBe(0);
    expect(r.weightedError).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F @arbitro/eval test metrics`
Expected: FAIL — cannot find module `../src/metrics`.

- [ ] **Step 3: Write `metrics.ts`**

`packages/eval/src/metrics.ts`:
```typescript
import type { CostTier } from "arbitro";

export function accuracy(expected: string[], predicted: string[]): number {
  if (expected.length === 0) return 1;
  let correct = 0;
  for (let i = 0; i < expected.length; i++) {
    if (expected[i] === predicted[i]) correct++;
  }
  return correct / expected.length;
}

export function macroF1(expected: string[], predicted: string[], labels: string[]): number {
  if (labels.length === 0) return 1;
  let sum = 0;
  for (const label of labels) {
    let tp = 0;
    let fp = 0;
    let fn = 0;
    for (let i = 0; i < expected.length; i++) {
      const isExpected = expected[i] === label;
      const isPredicted = predicted[i] === label;
      if (isPredicted && isExpected) tp++;
      else if (isPredicted && !isExpected) fp++;
      else if (!isPredicted && isExpected) fn++;
    }
    const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
    const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
    const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
    sum += f1;
  }
  return sum / labels.length;
}

export interface Confusion {
  labels: string[];
  matrix: Record<string, Record<string, number>>;
}

export function confusion(expected: string[], predicted: string[], labels: string[]): Confusion {
  const matrix: Record<string, Record<string, number>> = {};
  for (const row of labels) {
    matrix[row] = {};
    for (const col of labels) matrix[row]![col] = 0;
  }
  for (let i = 0; i < expected.length; i++) {
    const e = expected[i]!;
    const p = predicted[i]!;
    if (matrix[e] && matrix[e]![p] !== undefined) matrix[e]![p]++;
  }
  return { labels, matrix };
}

export const TIER_COST: Record<CostTier, number> = { low: 1, medium: 5, high: 25 };

const TIER_RANK: Record<CostTier, number> = { low: 0, medium: 1, high: 2 };

export function simulatedCost(tiers: CostTier[]): number {
  return tiers.reduce((sum, t) => sum + TIER_COST[t], 0);
}

export function alwaysPremiumCost(n: number): number {
  return n * TIER_COST.high;
}

export interface TierError {
  underProvisionRate: number;
  overProvisionRate: number;
  weightedError: number;
}

export function tierError(expected: CostTier[], predicted: CostTier[]): TierError {
  const n = expected.length;
  if (n === 0) return { underProvisionRate: 0, overProvisionRate: 0, weightedError: 0 };
  let under = 0;
  let over = 0;
  let weighted = 0;
  // Under-provisioning (predicted below need) is a quality risk — penalized 2x the
  // money cost of over-provisioning, per the design's asymmetry.
  const UNDER_PENALTY = 2;
  const OVER_PENALTY = 1;
  for (let i = 0; i < n; i++) {
    const diff = TIER_RANK[predicted[i]!] - TIER_RANK[expected[i]!];
    if (diff < 0) {
      under++;
      weighted += UNDER_PENALTY * Math.abs(diff);
    } else if (diff > 0) {
      over++;
      weighted += OVER_PENALTY * diff;
    }
  }
  return { underProvisionRate: under / n, overProvisionRate: over / n, weightedError: weighted / n };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm -F @arbitro/eval test metrics`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/eval/src/metrics.ts packages/eval/tests/metrics.test.ts
git commit -m "feat: add pure evaluation metrics (accuracy, macroF1, confusion, cost, tier error)"
```

---

### Task 4: Runner (predict via `arbitro`)

**Files:**
- Create: `packages/eval/src/runner.ts`
- Test: `packages/eval/tests/runner.test.ts`

**Interfaces:**
- Consumes: `createArbitro`, `DEFAULT_CATALOG` from `arbitro`; `EvalDataset`, `Prediction` from `./types`.
- Produces: `function predict(dataset: EvalDataset, costPreference?: number): Prediction[]`.

- [ ] **Step 1: Write the failing test**

`packages/eval/tests/runner.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { predict } from "../src/runner";
import type { EvalDataset } from "../src/types";
import { DEFAULT_CATALOG } from "arbitro";

const dataset: EvalDataset = {
  version: "fixture.1",
  cases: [
    { id: "c1", prompt: "escreva uma função em rust", lang: "pt", expected: { task: "code", complexity: "medium", needs_structured_output: false, tier: "medium" }, tags: [] },
    { id: "c2", prompt: "extraia os dados e devolva em JSON", lang: "pt", expected: { task: "json_extraction", complexity: "low", needs_structured_output: true, tier: "low" }, tags: [] },
  ],
};

describe("predict", () => {
  it("returns one prediction per case, preserving id order", () => {
    const preds = predict(dataset);
    expect(preds.map((p) => p.id)).toEqual(["c1", "c2"]);
  });

  it("classifies the code and json prompts", () => {
    const [c1, c2] = predict(dataset);
    expect(c1!.task).toBe("code");
    expect(c2!.task).toBe("json_extraction");
    expect(c2!.needs_structured_output).toBe(true);
  });

  it("resolves each chosen model's tier from the catalog", () => {
    const validTiers = new Set(["low", "medium", "high"]);
    for (const p of predict(dataset)) {
      expect(p.model.length).toBeGreaterThan(0);
      expect(validTiers.has(p.tier)).toBe(true);
      const entry = DEFAULT_CATALOG.models.find((m) => m.slug === p.model);
      expect(entry).toBeDefined();
      expect(p.tier).toBe(entry!.costTier);
    }
  });

  it("is deterministic", () => {
    expect(predict(dataset)).toEqual(predict(dataset));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F @arbitro/eval test runner`
Expected: FAIL — cannot find module `../src/runner`.

- [ ] **Step 3: Write `runner.ts`**

`packages/eval/src/runner.ts`:
```typescript
import { createArbitro, DEFAULT_CATALOG } from "arbitro";
import type { CostTier } from "arbitro";
import type { EvalDataset, Prediction } from "./types";

const SLUG_TIER: Record<string, CostTier> = Object.fromEntries(
  DEFAULT_CATALOG.models.map((m) => [m.slug, m.costTier]),
);

export function predict(dataset: EvalDataset, costPreference = 0.5): Prediction[] {
  const arbitro = createArbitro({ costPreference });
  return dataset.cases.map((c) => {
    const d = arbitro.judge(c.prompt);
    return {
      id: c.id,
      task: d.task,
      complexity: d.complexity,
      needs_structured_output: d.needs_structured_output,
      model: d.model,
      tier: SLUG_TIER[d.model] ?? "medium",
    };
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm -F @arbitro/eval test runner`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/eval/src/runner.ts packages/eval/tests/runner.test.ts
git commit -m "feat: add runner that predicts via arbitro and resolves model tiers"
```

---

### Task 5: Report (evaluate, format, thresholds)

**Files:**
- Create: `packages/eval/src/report.ts`
- Test: `packages/eval/tests/report.test.ts`

**Interfaces:**
- Consumes: `metrics.*` from `./metrics`; `predict` from `./runner`; `EvalDataset`, `Prediction` from `./types`; `Task`, `CostTier` from `arbitro`.
- Produces:
  - `interface EvalReport { n; taskAccuracy; complexityAccuracy; structuredAccuracy; taskMacroF1; taskConfusion; tierConfusion; tierError; simulatedCost; alwaysPremiumCost; savingsPct }`
  - `interface Thresholds { minTaskAccuracy: number; minComplexityAccuracy: number; minStructuredAccuracy: number; maxUnderProvisionRate: number }`
  - `function evaluate(dataset: EvalDataset, costPreference?: number): EvalReport`
  - `function formatReport(report: EvalReport): string`
  - `function checkThresholds(report: EvalReport, thresholds: Thresholds): { passed: boolean; failures: string[] }`

- [ ] **Step 1: Write the failing test**

`packages/eval/tests/report.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { evaluate, formatReport, checkThresholds } from "../src/report";
import type { Thresholds } from "../src/report";
import type { EvalDataset } from "../src/types";

const dataset: EvalDataset = {
  version: "fixture.1",
  cases: [
    { id: "c1", prompt: "escreva uma função em rust", lang: "pt", expected: { task: "code", complexity: "medium", needs_structured_output: false, tier: "medium" }, tags: [] },
    { id: "c2", prompt: "extraia os dados e devolva em JSON", lang: "pt", expected: { task: "json_extraction", complexity: "low", needs_structured_output: true, tier: "low" }, tags: [] },
    { id: "c3", prompt: "oi, tudo bem?", lang: "pt", expected: { task: "chat", complexity: "low", needs_structured_output: false, tier: "low" }, tags: [] },
  ],
};

describe("evaluate", () => {
  it("computes accuracies, cost, and savings over the dataset", () => {
    const r = evaluate(dataset);
    expect(r.n).toBe(3);
    expect(r.taskAccuracy).toBeGreaterThan(0.5);
    expect(r.taskMacroF1).toBeGreaterThan(0);
    expect(r.simulatedCost).toBeLessThanOrEqual(r.alwaysPremiumCost);
    expect(r.savingsPct).toBeGreaterThanOrEqual(0);
    expect(r.savingsPct).toBeLessThanOrEqual(100);
  });
});

describe("formatReport", () => {
  it("produces a non-empty human-readable string mentioning the key metrics", () => {
    const s = formatReport(evaluate(dataset));
    expect(s).toMatch(/task accuracy/i);
    expect(s).toMatch(/savings/i);
  });
});

describe("checkThresholds", () => {
  const report = evaluate(dataset);
  it("passes when all thresholds are met", () => {
    const t: Thresholds = { minTaskAccuracy: 0, minComplexityAccuracy: 0, minStructuredAccuracy: 0, maxUnderProvisionRate: 1 };
    expect(checkThresholds(report, t).passed).toBe(true);
  });
  it("fails and lists the offending metric when a threshold is not met", () => {
    const t: Thresholds = { minTaskAccuracy: 1.1, minComplexityAccuracy: 0, minStructuredAccuracy: 0, maxUnderProvisionRate: 1 };
    const r = checkThresholds(report, t);
    expect(r.passed).toBe(false);
    expect(r.failures.join(" ")).toMatch(/task accuracy/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F @arbitro/eval test report`
Expected: FAIL — cannot find module `../src/report`.

- [ ] **Step 3: Write `report.ts`**

`packages/eval/src/report.ts`:
```typescript
import type { Task, CostTier } from "arbitro";
import type { EvalDataset } from "./types";
import { predict } from "./runner";
import {
  accuracy,
  macroF1,
  confusion,
  simulatedCost,
  alwaysPremiumCost,
  tierError,
  type Confusion,
  type TierError,
} from "./metrics";

const TASK_LABELS: Task[] = ["chat", "summary", "code", "research", "json_extraction", "translation"];
const TIER_LABELS: CostTier[] = ["low", "medium", "high"];

export interface EvalReport {
  n: number;
  taskAccuracy: number;
  complexityAccuracy: number;
  structuredAccuracy: number;
  taskMacroF1: number;
  taskConfusion: Confusion;
  tierConfusion: Confusion;
  tierError: TierError;
  simulatedCost: number;
  alwaysPremiumCost: number;
  savingsPct: number;
}

export interface Thresholds {
  minTaskAccuracy: number;
  minComplexityAccuracy: number;
  minStructuredAccuracy: number;
  maxUnderProvisionRate: number;
}

export function evaluate(dataset: EvalDataset, costPreference = 0.5): EvalReport {
  const preds = predict(dataset, costPreference);
  const expTask = dataset.cases.map((c) => c.expected.task);
  const expComplexity = dataset.cases.map((c) => c.expected.complexity);
  const expStructured = dataset.cases.map((c) => String(c.expected.needs_structured_output));
  const expTier = dataset.cases.map((c) => c.expected.tier);

  const predTask = preds.map((p) => p.task);
  const predComplexity = preds.map((p) => p.complexity);
  const predStructured = preds.map((p) => String(p.needs_structured_output));
  const predTier = preds.map((p) => p.tier);

  const cost = simulatedCost(predTier);
  const premium = alwaysPremiumCost(preds.length);
  const savingsPct = premium === 0 ? 0 : ((premium - cost) / premium) * 100;

  return {
    n: preds.length,
    taskAccuracy: accuracy(expTask, predTask),
    complexityAccuracy: accuracy(expComplexity, predComplexity),
    structuredAccuracy: accuracy(expStructured, predStructured),
    taskMacroF1: macroF1(expTask, predTask, TASK_LABELS),
    taskConfusion: confusion(expTask, predTask, TASK_LABELS),
    tierConfusion: confusion(expTier, predTier, TIER_LABELS),
    tierError: tierError(expTier, predTier),
    simulatedCost: cost,
    alwaysPremiumCost: premium,
    savingsPct,
  };
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function formatReport(r: EvalReport): string {
  const lines = [
    `Arbitro eval — ${r.n} cases`,
    ``,
    `  task accuracy:        ${pct(r.taskAccuracy)}`,
    `  complexity accuracy:  ${pct(r.complexityAccuracy)}`,
    `  structured accuracy:  ${pct(r.structuredAccuracy)}`,
    `  task macro-F1:        ${r.taskMacroF1.toFixed(3)}`,
    `  under-provision rate: ${pct(r.tierError.underProvisionRate)}`,
    `  over-provision rate:  ${pct(r.tierError.overProvisionRate)}`,
    ``,
    `  simulated cost:       ${r.simulatedCost} (always-premium: ${r.alwaysPremiumCost})`,
    `  savings vs premium:   ${r.savingsPct.toFixed(1)}%`,
  ];
  return lines.join("\n");
}

export function checkThresholds(
  r: EvalReport,
  t: Thresholds,
): { passed: boolean; failures: string[] } {
  const failures: string[] = [];
  if (r.taskAccuracy < t.minTaskAccuracy)
    failures.push(`task accuracy ${pct(r.taskAccuracy)} < ${pct(t.minTaskAccuracy)}`);
  if (r.complexityAccuracy < t.minComplexityAccuracy)
    failures.push(`complexity accuracy ${pct(r.complexityAccuracy)} < ${pct(t.minComplexityAccuracy)}`);
  if (r.structuredAccuracy < t.minStructuredAccuracy)
    failures.push(`structured accuracy ${pct(r.structuredAccuracy)} < ${pct(t.minStructuredAccuracy)}`);
  if (r.tierError.underProvisionRate > t.maxUnderProvisionRate)
    failures.push(`under-provision rate ${pct(r.tierError.underProvisionRate)} > ${pct(t.maxUnderProvisionRate)}`);
  return { passed: failures.length === 0, failures };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm -F @arbitro/eval test report`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/eval/src/report.ts packages/eval/tests/report.test.ts
git commit -m "feat: add eval report (evaluate, formatReport, checkThresholds)"
```

---

### Task 6: CLI + thresholds + README

**Files:**
- Modify: `packages/eval/src/index.ts` (replace smoke export)
- Delete: `packages/eval/tests/smoke.test.ts` (via `git rm`)
- Create: `packages/eval/thresholds.json`
- Create: `packages/eval/README.md`
- Test: `packages/eval/tests/cli-gate.test.ts`

**Interfaces:**
- Consumes: `evaluate`, `formatReport`, `checkThresholds`, `Thresholds` from `./report`; `validateDataset` from `./dataset-schema`; `EvalDataset` from `./types`.
- Produces: `function runEval(dataset: EvalDataset, thresholds: Thresholds): { report: EvalReport; output: string; exitCode: number }` plus a top-level CLI that loads the files and calls `process.exit`.

- [ ] **Step 1: Remove the obsolete smoke test**

Run:
```bash
git rm packages/eval/tests/smoke.test.ts
```

- [ ] **Step 2: Create `thresholds.json`**

Pisos deliberately conservative for the bootstrap dataset — tighten as the dataset grows and the router improves.

`packages/eval/thresholds.json`:
```json
{
  "minTaskAccuracy": 0.6,
  "minComplexityAccuracy": 0.5,
  "minStructuredAccuracy": 0.8,
  "maxUnderProvisionRate": 0.4
}
```

- [ ] **Step 3: Write the failing CLI-gate test**

`packages/eval/tests/cli-gate.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { runEval } from "../src/index";
import type { Thresholds } from "../src/report";
import type { EvalDataset } from "../src/types";

const dataset: EvalDataset = {
  version: "fixture.1",
  cases: [
    { id: "c1", prompt: "escreva uma função em rust", lang: "pt", expected: { task: "code", complexity: "medium", needs_structured_output: false, tier: "medium" }, tags: [] },
    { id: "c2", prompt: "oi, tudo bem?", lang: "pt", expected: { task: "chat", complexity: "low", needs_structured_output: false, tier: "low" }, tags: [] },
  ],
};

describe("runEval", () => {
  it("exit code 0 and passing report when thresholds are met", () => {
    const t: Thresholds = { minTaskAccuracy: 0, minComplexityAccuracy: 0, minStructuredAccuracy: 0, maxUnderProvisionRate: 1 };
    const r = runEval(dataset, t);
    expect(r.exitCode).toBe(0);
    expect(r.output).toMatch(/task accuracy/i);
    expect(r.output).toMatch(/PASS/);
  });

  it("exit code 1 and failure listed when a threshold is not met", () => {
    const t: Thresholds = { minTaskAccuracy: 1.1, minComplexityAccuracy: 0, minStructuredAccuracy: 0, maxUnderProvisionRate: 1 };
    const r = runEval(dataset, t);
    expect(r.exitCode).toBe(1);
    expect(r.output).toMatch(/FAIL/);
    expect(r.output).toMatch(/task accuracy/i);
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `pnpm -F @arbitro/eval test cli-gate`
Expected: FAIL — `runEval` not exported from `../src/index`.

- [ ] **Step 5: Write `index.ts`**

`packages/eval/src/index.ts`:
```typescript
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { evaluate, formatReport, checkThresholds, type Thresholds, type EvalReport } from "./report";
import { validateDataset } from "./dataset-schema";
import type { EvalDataset } from "./types";

export function runEval(
  dataset: EvalDataset,
  thresholds: Thresholds,
): { report: EvalReport; output: string; exitCode: number } {
  const report = evaluate(dataset);
  const gate = checkThresholds(report, thresholds);
  const lines = [formatReport(report), ""];
  if (gate.passed) {
    lines.push("PASS — all thresholds met");
  } else {
    lines.push("FAIL — thresholds not met:");
    for (const f of gate.failures) lines.push(`  - ${f}`);
  }
  return { report, output: lines.join("\n"), exitCode: gate.passed ? 0 : 1 };
}

function loadJson<T>(relPath: string): T {
  const path = fileURLToPath(new URL(relPath, import.meta.url));
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function main(): void {
  const raw = loadJson<unknown>("../dataset/cases.json");
  const validation = validateDataset(raw);
  if (!validation.valid) {
    console.error("Invalid dataset:\n" + validation.errors.map((e) => "  - " + e).join("\n"));
    process.exit(2);
  }
  const thresholds = loadJson<Thresholds>("../thresholds.json");
  const { output, exitCode } = runEval(raw as EvalDataset, thresholds);
  console.log(output);
  process.exit(exitCode);
}

// Run only when invoked as a script (not when imported by tests).
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) main();
```

- [ ] **Step 6: Run test to verify it passes**

Run: `pnpm -F @arbitro/eval test cli-gate`
Expected: PASS.

- [ ] **Step 7: Run the CLI against the real committed dataset**

Run:
```bash
pnpm -F @arbitro/eval eval
echo "exit: $?"
```
Expected: prints the metrics table + `PASS` (bootstrap thresholds are conservative). If it prints `FAIL`, that is a real signal — read which metric missed and either fix a genuine routing bug or record the gap; do not loosen thresholds just to pass without justification.

- [ ] **Step 8: Write `README.md`**

`packages/eval/README.md`:
````markdown
# @arbitro/eval

Private evaluation harness for the `arbitro` router. Measures decision quality against a
frozen labeled dataset and gates CI on regression. Not published.

## Run the evaluation

```bash
pnpm -F @arbitro/eval eval
```

Prints task/complexity/structured accuracy, macro-F1, tier under/over-provision rates, and
simulated cost vs. an always-premium baseline. Exits non-zero if any metric in
`thresholds.json` is missed — wire this into CI to block regressions.

## Grow the dataset

`dataset/cases.json` is frozen and versioned. To expand it, run the offline generator
(requires `OPENROUTER_API_KEY`), then review the additions before committing:

```bash
OPENROUTER_API_KEY=... pnpm -F @arbitro/eval generate
```

The generator is the only part that touches the network. The evaluator and CI never do —
they read the frozen JSON, so results are reproducible.

## Notes

- `tier` labels target a cost band (low/medium/high), not a specific model slug, so the
  dataset doesn't rot when the catalog changes.
- Metrics are pure functions tested with inline fixtures; the committed dataset is consumed
  only by `pnpm eval`.
````

- [ ] **Step 9: Full suite + typecheck**

Run:
```bash
pnpm -F @arbitro/eval test
pnpm -F @arbitro/eval typecheck
```
Expected: all tests pass, typecheck clean.

- [ ] **Step 10: Commit**

```bash
git add packages/eval/src/index.ts packages/eval/thresholds.json packages/eval/README.md packages/eval/tests/cli-gate.test.ts
git commit -m "feat: add eval CLI with CI threshold gate + README"
```

---

### Task 7: Offline dataset generation script + expand the dataset

**Files:**
- Create: `packages/eval/scripts/generate.ts`
- Modify: `packages/eval/dataset/cases.json` (expanded, regenerated + reviewed)

**Interfaces:**
- Consumes: `validateDataset` from `../src/dataset-schema`; `EvalCase`, `EvalDataset` from `../src/types`.
- Produces: a runnable dev tool `pnpm -F @arbitro/eval generate` that writes `dataset/cases.json`. Not imported by any other module; not covered by the unit suite.

- [ ] **Step 1: Write `generate.ts`**

`packages/eval/scripts/generate.ts`:
```typescript
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { validateDataset } from "../src/dataset-schema";
import type { EvalCase, EvalDataset } from "../src/types";

// Offline dev tool. Uses OpenRouter to synthesize labeled cases, validates them, and
// writes dataset/cases.json. Requires OPENROUTER_API_KEY. NOT run in CI.

const MODEL = process.env.ARBITRO_GEN_MODEL ?? "anthropic/claude-sonnet-4.5";
const TARGETS = [
  { task: "chat", n: 8 },
  { task: "summary", n: 8 },
  { task: "code", n: 8 },
  { task: "research", n: 8 },
  { task: "json_extraction", n: 8 },
  { task: "translation", n: 8 },
] as const;

const SYSTEM = `You generate labeled evaluation cases for a prompt→model router.
Return ONLY a JSON array (no markdown) of objects with this exact shape:
{"prompt": string, "lang": "pt"|"en", "expected": {"task": <TASK>, "complexity":"low"|"medium"|"high", "needs_structured_output": boolean, "tier":"low"|"medium"|"high"}}
Rules: prompts must be realistic and varied (mix pt and en). "task" MUST equal the target task.
"needs_structured_output" is true only when the prompt explicitly asks for JSON/table/keys.
"tier" is the appropriate cost band: trivial→low, intermediate→medium, hard-reasoning→high.`;

async function generateFor(task: string, n: number): Promise<EvalCase[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is required to generate the dataset");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM.replace("<TASK>", `"${task}"`) },
        { role: "user", content: `Generate ${n} cases for task "${task}".` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { choices: { message: { content: string } }[] };
  const text = json.choices[0]!.message.content.replace(/^```json\s*|\s*```$/g, "").trim();
  const rows = JSON.parse(text) as Array<Omit<EvalCase, "id" | "tags">>;
  return rows.map((r, i) => ({
    id: `${task}-${String(i + 1).padStart(3, "0")}`,
    prompt: r.prompt,
    lang: r.lang,
    expected: r.expected,
    tags: [task, r.lang],
  }));
}

async function main(): Promise<void> {
  const all: EvalCase[] = [];
  for (const { task, n } of TARGETS) {
    process.stderr.write(`generating ${n} cases for ${task}...\n`);
    all.push(...(await generateFor(task, n)));
  }
  const dataset: EvalDataset = { version: `${new Date().toISOString().slice(0, 10)}.gen`, cases: all };

  const validation = validateDataset(dataset);
  if (!validation.valid) {
    console.error("Generated dataset failed validation:\n" + validation.errors.join("\n"));
    process.exit(1);
  }
  const out = fileURLToPath(new URL("../dataset/cases.json", import.meta.url));
  writeFileSync(out, JSON.stringify(dataset, null, 2) + "\n");
  process.stderr.write(`wrote ${all.length} cases to ${out}\n`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
```

- [ ] **Step 2: Typecheck the script**

Run: `pnpm -F @arbitro/eval typecheck`
Expected: clean (the script is included in the tsconfig).

Note: `new Date()` here is acceptable — this script is a dev tool, explicitly outside the deterministic evaluator/CI path (Global Constraints scope the determinism rule to `runner`/`report`/`metrics`/`index`).

- [ ] **Step 3: Generate and review the dataset**

This step needs judgment and (in a real run) an API key. For agentic execution WITHOUT a key: skip the live generation and instead expand `dataset/cases.json` by hand to ≥ 40 cases following the exact shape of the bootstrap entries (add more per task, both languages, plus a few adversarial cases like "escreva um poema sobre quicksort" → `chat`/creative, and "não quero código, só explique closures" → `chat`). Keep every entry hand-verified and schema-valid.

For a run WITH a key:
```bash
OPENROUTER_API_KEY=... pnpm -F @arbitro/eval generate
```
Then **review the generated cases by sampling** — fix or drop any mislabeled ones. The generator's labels are a starting point, not ground truth.

- [ ] **Step 4: Verify the expanded dataset is valid and the eval still gates**

Run:
```bash
pnpm -F @arbitro/eval test dataset-schema
pnpm -F @arbitro/eval eval
echo "exit: $?"
```
Expected: dataset-schema test passes (committed dataset valid, ≥ 15 cases); `pnpm eval` prints the table. If the larger dataset now trips a threshold, that is a genuine finding about the v1 router — record it in the report (it is exactly what this harness exists to surface), and decide per-metric whether to fix the router or document the limitation. Do not silently loosen thresholds.

- [ ] **Step 5: Commit**

```bash
git add packages/eval/scripts/generate.ts packages/eval/dataset/cases.json
git commit -m "feat: add offline dataset generator and expand the eval dataset"
```

---

### Task 8: Final verification + CI note

**Files:**
- Modify: root `package.json` (add an `eval` script to the workspace root)
- Modify: `docs/superpowers/specs/2026-07-09-arbitro-eval-harness-design.md` is unchanged; no code files beyond the root script.

- [ ] **Step 1: Add a root `eval` script**

Modify root `package.json` scripts to add:
```json
    "eval": "pnpm -F @arbitro/eval eval"
```
Place it alongside the existing `build`/`test`/`typecheck`/`dev` scripts. Change nothing else.

- [ ] **Step 2: Full monorepo verification**

Run:
```bash
pnpm -r build
pnpm -r test
pnpm -r typecheck
pnpm eval; echo "eval exit: $?"
```
Expected: every package builds, all tests pass (arbitro + playground + eval), typecheck clean, and `pnpm eval` prints the metrics table with a `PASS`/`FAIL` verdict and a matching exit code.

- [ ] **Step 3: Read the eval output with fresh eyes**

Look at the metrics table. Does the router's accuracy per task look plausible? Are the under/over-provision rates and the savings-vs-premium number sane? Any glaring misroute (e.g., a math prompt landing in `chat`) is a real v1 limitation — note it for a future classifier-tuning plan; it is not a blocker for this harness task.

- [ ] **Step 4: Commit**

```bash
git add package.json
git commit -m "chore: add root pnpm eval script"
```

---

## Self-Review

**1. Spec coverage:**
- Private `packages/eval`, not published → Task 1 (`"private": true`).
- No runtime deps; native fetch only in generator → Tasks 1, 7; Global Constraints.
- Offline/deterministic evaluator + CI → Tasks 4, 5, 6 (frozen `cases.json`, no network); determinism tests in Tasks 4.
- Reuse arbitro types + `DEFAULT_CATALOG` → Tasks 2, 4.
- Dataset format (`EvalCase`/`EvalDataset`, `tier` band, `lang`) → Task 2.
- Metrics (accuracy, macroF1, confusion, cost-weighted asymmetric tier error, simulated cost + savings) → Task 3 (metrics) + Task 5 (assembled).
- Regression gate (`thresholds.json`, `pnpm eval` exit 1) → Task 6.
- Offline LLM generation script, separate from CI, reviewed before commit → Task 7.
- Tests use inline fixtures, not `cases.json` → Tasks 3–6 (only the schema test reads the committed file, to assert its validity).
- Roadmap framing (unblocks calibration/embeddings) → spec only; no task needed.

**2. Placeholder scan:** No TBD/TODO. Every code step contains full code; every test step has real assertions. Task 7 Step 3 gives explicit hand-expansion instructions for the no-API-key path (not a placeholder — concrete alternative actions). ✓

**3. Type consistency:** `EvalCase`/`EvalDataset`/`Prediction` defined in Task 2 and used verbatim in Tasks 4–7. `validateDataset` (T2), `accuracy`/`macroF1`/`confusion`/`simulatedCost`/`alwaysPremiumCost`/`tierError`/`TIER_COST`/`Confusion`/`TierError` (T3), `predict` (T4), `evaluate`/`formatReport`/`checkThresholds`/`EvalReport`/`Thresholds` (T5), `runEval` (T6) — names consistent across consumers. `TIER_COST` values `{low:1,medium:5,high:25}` match the spec and the metrics test. Package name `@arbitro/eval` used consistently in all `pnpm -F` commands and scripts. ✓
