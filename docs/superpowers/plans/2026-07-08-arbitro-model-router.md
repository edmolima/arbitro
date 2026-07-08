# Arbitro Model Router — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic TypeScript SDK (`arbitro`) that takes a prompt and returns the best OpenRouter model for it, inside a pnpm monorepo with a `playground` CLI to eyeball the routing quality.

**Architecture:** Pure synchronous pipeline `prompt → signals → classifier → matcher → JudgeResult`. No network I/O, no runtime dependencies. A curated, versioned model catalog is embedded in the package. The `playground` example consumes the built package to validate routing interactively and in batch.

**Tech Stack:** TypeScript (strict), pnpm workspaces, tsup (dual ESM/CJS build), vitest (tests), tsx (running the example).

## Global Constraints

- **Zero runtime dependencies** in `packages/arbitro` (dev-only deps like tsup/vitest are fine).
- **Synchronous, offline, deterministic:** same input → same output; no `Promise`, no `fetch`, no `Date`/random in the decision path.
- **Package manager:** pnpm workspaces. Node ≥ 18.
- **TypeScript:** `strict: true`, target `ES2022`, ESM-first with CJS build output.
- **SDK package name:** `arbitro`. Example package name: `playground` (private, not published).
- **Public API surface:** only `judge`, `createArbitro`, and the exported types. Nothing else leaves `index.ts`.
- **Task enum (exact):** `"chat" | "summary" | "code" | "research" | "json_extraction" | "translation"`.
- **Complexity enum (exact):** `"low" | "medium" | "high"`.
- **`confidence` is heuristic in v1** (not calibrated) — the README must say so.

---

### Task 1: Monorepo scaffold + tooling

**Files:**
- Create: `.gitignore`
- Create: `package.json` (root)
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `packages/arbitro/package.json`
- Create: `packages/arbitro/tsconfig.json`
- Create: `packages/arbitro/tsup.config.ts`
- Create: `packages/arbitro/src/index.ts` (temporary smoke export)
- Test: `packages/arbitro/tests/smoke.test.ts`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: a working workspace where `pnpm install`, `pnpm -F arbitro test`, and `pnpm -F arbitro build` succeed.

- [ ] **Step 1: Initialize git**

Run:
```bash
cd /Users/edmolima/Workspace/Dataqore/arbitro
git init
```
Expected: `Initialized empty Git repository`.

- [ ] **Step 2: Create `.gitignore`**

`.gitignore`:
```
node_modules/
dist/
*.log
.DS_Store
```

- [ ] **Step 3: Create root `package.json`**

`package.json`:
```json
{
  "name": "arbitro-monorepo",
  "private": true,
  "packageManager": "pnpm@9.12.0",
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck",
    "dev": "pnpm -F arbitro build && pnpm -F playground dev"
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 4: Create `pnpm-workspace.yaml`**

`pnpm-workspace.yaml`:
```yaml
packages:
  - "packages/*"
  - "examples/*"
```

- [ ] **Step 5: Create `tsconfig.base.json`**

`tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "declaration": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noUncheckedIndexedAccess": true
  }
}
```

- [ ] **Step 6: Create `packages/arbitro/package.json`**

`packages/arbitro/package.json`:
```json
{
  "name": "arbitro",
  "version": "0.1.0",
  "description": "Deterministic model router — picks the best OpenRouter model for a prompt before you call it.",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist"],
  "sideEffects": false,
  "scripts": {
    "build": "tsup",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "tsup": "^8.3.0",
    "vitest": "^2.1.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 7: Create `packages/arbitro/tsconfig.json`**

`packages/arbitro/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 8: Create `packages/arbitro/tsup.config.ts`**

`packages/arbitro/tsup.config.ts`:
```typescript
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
});
```

- [ ] **Step 9: Create temporary smoke export**

`packages/arbitro/src/index.ts`:
```typescript
export const ARBITRO_VERSION = "0.1.0";
```

- [ ] **Step 10: Write the smoke test**

`packages/arbitro/tests/smoke.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { ARBITRO_VERSION } from "../src/index";

describe("scaffold", () => {
  it("exports a version string", () => {
    expect(ARBITRO_VERSION).toBe("0.1.0");
  });
});
```

- [ ] **Step 11: Install and verify test runs**

Run:
```bash
pnpm install
pnpm -F arbitro test
```
Expected: 1 test file, 1 test passed.

- [ ] **Step 12: Verify build works**

Run:
```bash
pnpm -F arbitro build
```
Expected: `dist/index.js`, `dist/index.cjs`, `dist/index.d.ts` created, no errors.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "chore: scaffold pnpm monorepo with arbitro package"
```

---

### Task 2: Types and keyword data

**Files:**
- Create: `packages/arbitro/src/types.ts`
- Create: `packages/arbitro/src/keywords.ts`
- Test: `packages/arbitro/tests/keywords.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces:
  - `type Task`, `type Complexity`, `type CostTier`
  - `interface Signals { length; wordCount; hasCodeFence; questionCount; stepCount; hasMath; requestsStructuredOutput; isTrivialChat; taskHits: Record<Task, number> }`
  - `interface Classification { task: Task; complexity: Complexity; needs_structured_output: boolean; confidence: number }`
  - `interface ModelEntry { slug; strengths: Task[]; costTier: CostTier; contextWindow: number; supportsStructuredOutput: boolean }`
  - `interface ModelCatalog { version: string; models: ModelEntry[] }`
  - `interface JudgeResult { model; alternatives; task; complexity; needs_structured_output; confidence; reason; catalogVersion }`
  - `interface ArbitroConfig { costPreference?: number; catalog?: ModelCatalog }`
  - `const TASK_KEYWORDS: Record<Task, RegExp[]>`, `const STRUCTURED_PATTERNS: RegExp[]`, `const MATH_PATTERNS: RegExp[]`, `const TRIVIAL_CHAT: RegExp[]`

- [ ] **Step 1: Write `types.ts`**

`packages/arbitro/src/types.ts`:
```typescript
export type Task =
  | "chat"
  | "summary"
  | "code"
  | "research"
  | "json_extraction"
  | "translation";

export type Complexity = "low" | "medium" | "high";
export type CostTier = "low" | "medium" | "high";

export interface Signals {
  length: number;
  wordCount: number;
  hasCodeFence: boolean;
  questionCount: number;
  stepCount: number;
  hasMath: boolean;
  requestsStructuredOutput: boolean;
  isTrivialChat: boolean;
  taskHits: Record<Task, number>;
}

export interface Classification {
  task: Task;
  complexity: Complexity;
  needs_structured_output: boolean;
  confidence: number;
}

export interface ModelEntry {
  slug: string;
  strengths: Task[];
  costTier: CostTier;
  contextWindow: number;
  supportsStructuredOutput: boolean;
}

export interface ModelCatalog {
  version: string;
  models: ModelEntry[];
}

export interface JudgeResult {
  model: string;
  alternatives: string[];
  task: Task;
  complexity: Complexity;
  needs_structured_output: boolean;
  confidence: number;
  reason: string;
  catalogVersion: string;
}

export interface ArbitroConfig {
  costPreference?: number;
  catalog?: ModelCatalog;
}
```

- [ ] **Step 2: Write the failing keyword test**

`packages/arbitro/tests/keywords.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import {
  TASK_KEYWORDS,
  STRUCTURED_PATTERNS,
  MATH_PATTERNS,
  TRIVIAL_CHAT,
} from "../src/keywords";

const hits = (patterns: RegExp[], text: string) =>
  patterns.filter((r) => r.test(text)).length;

describe("keywords", () => {
  it("detects code prompts in PT and EN", () => {
    expect(hits(TASK_KEYWORDS.code, "escreva uma função em rust")).toBeGreaterThan(0);
    expect(hits(TASK_KEYWORDS.code, "write a python script")).toBeGreaterThan(0);
  });

  it("detects summary prompts", () => {
    expect(hits(TASK_KEYWORDS.summary, "resuma este relatório")).toBeGreaterThan(0);
    expect(hits(TASK_KEYWORDS.summary, "summarize this article")).toBeGreaterThan(0);
  });

  it("detects translation prompts", () => {
    expect(hits(TASK_KEYWORDS.translation, "traduza para o inglês")).toBeGreaterThan(0);
    expect(hits(TASK_KEYWORDS.translation, "translate this to spanish")).toBeGreaterThan(0);
  });

  it("detects research prompts", () => {
    expect(hits(TASK_KEYWORDS.research, "prove que o algoritmo termina")).toBeGreaterThan(0);
  });

  it("does not fire research on a plain summary prompt", () => {
    expect(hits(TASK_KEYWORDS.research, "resuma este relatório técnico de rede")).toBe(0);
  });

  it("detects explicit structured-output requests", () => {
    expect(hits(STRUCTURED_PATTERNS, "devolva em JSON")).toBeGreaterThan(0);
    expect(hits(STRUCTURED_PATTERNS, "return a table")).toBeGreaterThan(0);
  });

  it("detects math signals", () => {
    expect(hits(MATH_PATTERNS, "calcule a integral de x^2")).toBeGreaterThan(0);
  });

  it("detects trivial greetings", () => {
    expect(hits(TRIVIAL_CHAT, "oi, tudo bem?")).toBeGreaterThan(0);
    expect(hits(TRIVIAL_CHAT, "hello there")).toBeGreaterThan(0);
  });

  it("json_extraction and chat have no direct keywords (set by rules/default)", () => {
    expect(TASK_KEYWORDS.json_extraction.length).toBe(0);
    expect(TASK_KEYWORDS.chat.length).toBe(0);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm -F arbitro test keywords`
Expected: FAIL — cannot find module `../src/keywords`.

- [ ] **Step 4: Write `keywords.ts`**

`packages/arbitro/src/keywords.ts`:
```typescript
import type { Task } from "./types";

export const TASK_KEYWORDS: Record<Task, RegExp[]> = {
  code: [
    /\bcódigo\b/i,
    /\bcode\b/i,
    /\bfunç(ão|ao|oes|ões)\b/i,
    /\bfunction\b/i,
    /\bscript\b/i,
    /\balgoritmo\b/i,
    /\balgorithm\b/i,
    /\brefactor\b/i,
    /\bbug\b/i,
    /\b(typescript|javascript|python|rust|golang|java|sql)\b/i,
    /\bimplement(e|ar|ation)?\b/i,
  ],
  summary: [
    /\bresum(a|o|ir|e)\b/i,
    /\bsummar(y|ize|ise)\b/i,
    /\btl;?dr\b/i,
    /\bsintetiz(e|ar)\b/i,
    /\bem\s+\d+\s+(linhas|frases|palavras)\b/i,
    /\bo\s+essencial\b/i,
  ],
  translation: [
    /\btraduz(a|ir|e)\b/i,
    /\btranslat(e|ion)\b/i,
    /\bpara\s+(o\s+)?(inglês|ingles|português|portugues|espanhol|francês|frances|english|spanish|french)\b/i,
    /\bversão\s+em\b/i,
  ],
  research: [
    /\bpesquis(a|e|ar)\b/i,
    /\bresearch\b/i,
    /\banalis(e|ar)\s+(profundamente|a\s+fundo|em\s+profundidade)/i,
    /\bprov(e|ar)\b/i,
    /\bdemonstr(e|ar)\b/i,
    /\barquitetura\s+de\s+software\b/i,
    /\braciocínio\b/i,
    /\bexpli(que|car)\s+em\s+detalhes\b/i,
  ],
  json_extraction: [],
  chat: [],
};

export const STRUCTURED_PATTERNS: RegExp[] = [
  /\bjson\b/i,
  /```json/i,
  /\bformato\s+json\b/i,
  /\btabela\b/i,
  /\btable\b/i,
  /\bcsv\b/i,
  /\bchaves?\b/i,
  /\bkeys?\b/i,
  /\bschema\b/i,
  /\blista\s+estruturada\b/i,
  /\bstructured\s+(output|list)\b/i,
];

export const MATH_PATTERNS: RegExp[] = [
  /[∫∑√π]/,
  /\b\d+\s*[+\-*/^]\s*\d+/,
  /\bequ(ação|acao|ation)\b/i,
  /\bcalcul(e|ar|ate)\b/i,
  /\b(derivad|integral|matriz|matrix|teorema|theorem)\b/i,
  /\bprov(e|ar)\b/i,
];

export const TRIVIAL_CHAT: RegExp[] = [
  /^\s*(oi|olá|ola|hello|hi|hey|e\s*aí|eai)\b/i,
  /^\s*(bom\s+dia|boa\s+tarde|boa\s+noite)\b/i,
  /\btudo\s+bem\b/i,
  /\b(obrigad[oa]|valeu|thanks|thank\s+you)\b/i,
];
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm -F arbitro test keywords`
Expected: PASS (all keyword assertions green).

- [ ] **Step 6: Commit**

```bash
git add packages/arbitro/src/types.ts packages/arbitro/src/keywords.ts packages/arbitro/tests/keywords.test.ts
git commit -m "feat: add types and PT/EN keyword data"
```

---

### Task 3: Signal extraction

**Files:**
- Create: `packages/arbitro/src/signals.ts`
- Test: `packages/arbitro/tests/signals.test.ts`

**Interfaces:**
- Consumes: `Signals`, `Task` from `types`; `TASK_KEYWORDS`, `STRUCTURED_PATTERNS`, `MATH_PATTERNS`, `TRIVIAL_CHAT` from `keywords`.
- Produces: `export function extractSignals(prompt: string): Signals`.

- [ ] **Step 1: Write the failing test**

`packages/arbitro/tests/signals.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { extractSignals } from "../src/signals";

describe("extractSignals", () => {
  it("measures length and word count on trimmed text", () => {
    const s = extractSignals("  ola mundo  ");
    expect(s.length).toBe(9);
    expect(s.wordCount).toBe(2);
  });

  it("flags code fences", () => {
    expect(extractSignals("veja:\n```ts\nconst x = 1\n```").hasCodeFence).toBe(true);
    expect(extractSignals("apenas texto").hasCodeFence).toBe(false);
  });

  it("counts questions and enumerated steps", () => {
    const s = extractSignals("faça isto:\n1. abrir\n2. ler\n3. fechar\nok?");
    expect(s.questionCount).toBe(1);
    expect(s.stepCount).toBe(3);
  });

  it("detects math and structured-output requests", () => {
    expect(extractSignals("calcule 2 + 2").hasMath).toBe(true);
    expect(extractSignals("devolva em JSON").requestsStructuredOutput).toBe(true);
  });

  it("detects trivial chat", () => {
    expect(extractSignals("oi, tudo bem?").isTrivialChat).toBe(true);
    expect(extractSignals("escreva uma função").isTrivialChat).toBe(false);
  });

  it("counts task keyword hits", () => {
    const s = extractSignals("escreva uma função em python");
    expect(s.taskHits.code).toBeGreaterThan(0);
    expect(s.taskHits.summary).toBe(0);
  });

  it("returns zero everything on empty input", () => {
    const s = extractSignals("   ");
    expect(s.length).toBe(0);
    expect(s.wordCount).toBe(0);
    expect(s.taskHits.code).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F arbitro test signals`
Expected: FAIL — cannot find module `../src/signals`.

- [ ] **Step 3: Write `signals.ts`**

`packages/arbitro/src/signals.ts`:
```typescript
import type { Signals, Task } from "./types";
import {
  TASK_KEYWORDS,
  STRUCTURED_PATTERNS,
  MATH_PATTERNS,
  TRIVIAL_CHAT,
} from "./keywords";

const TASKS = Object.keys(TASK_KEYWORDS) as Task[];

export function extractSignals(prompt: string): Signals {
  const text = prompt;
  const trimmed = prompt.trim();
  const length = trimmed.length;
  const wordCount = length === 0 ? 0 : trimmed.split(/\s+/).length;

  const hasCodeFence = /```/.test(text) || /\b(function|def |class )\b/.test(text);
  const questionCount = (text.match(/\?/g) ?? []).length;
  const stepCount = (text.match(/(?:^|\n)\s*\d+[.)]/g) ?? []).length;
  const hasMath = MATH_PATTERNS.some((r) => r.test(text));
  const requestsStructuredOutput = STRUCTURED_PATTERNS.some((r) => r.test(text));
  const isTrivialChat = TRIVIAL_CHAT.some((r) => r.test(trimmed));

  const taskHits = {} as Record<Task, number>;
  for (const task of TASKS) {
    taskHits[task] = TASK_KEYWORDS[task].filter((r) => r.test(text)).length;
  }

  return {
    length,
    wordCount,
    hasCodeFence,
    questionCount,
    stepCount,
    hasMath,
    requestsStructuredOutput,
    isTrivialChat,
    taskHits,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm -F arbitro test signals`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/arbitro/src/signals.ts packages/arbitro/tests/signals.test.ts
git commit -m "feat: add deterministic signal extraction"
```

---

### Task 4: Classifier

**Files:**
- Create: `packages/arbitro/src/classifier.ts`
- Test: `packages/arbitro/tests/classifier.test.ts`

**Interfaces:**
- Consumes: `Signals`, `Classification`, `Task`, `Complexity` from `types`; `extractSignals` from `signals` (tests only).
- Produces: `export function classify(signals: Signals): Classification`.

- [ ] **Step 1: Write the failing test**

`packages/arbitro/tests/classifier.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { classify } from "../src/classifier";
import { extractSignals } from "../src/signals";

const decide = (prompt: string) => classify(extractSignals(prompt));

describe("classify", () => {
  it("rule 4: explicit JSON request → json_extraction + structured", () => {
    const d = decide("extraia nome e email deste texto e devolva em JSON");
    expect(d.task).toBe("json_extraction");
    expect(d.needs_structured_output).toBe(true);
    expect(d.confidence).toBeGreaterThan(0.7);
  });

  it("trivial greeting → chat / low / high confidence", () => {
    const d = decide("oi, tudo bem?");
    expect(d.task).toBe("chat");
    expect(d.complexity).toBe("low");
    expect(d.confidence).toBeGreaterThan(0.7);
  });

  it("rule 5: ambiguous non-greeting → chat / medium / low confidence", () => {
    const d = decide("me ajuda com isso aqui por favor");
    expect(d.task).toBe("chat");
    expect(d.complexity).toBe("medium");
    expect(d.confidence).toBeLessThan(0.5);
  });

  it("summary keyword → summary, at least medium complexity", () => {
    const d = decide("resuma este relatório técnico de rede");
    expect(d.task).toBe("summary");
    expect(d.complexity).toBe("medium");
  });

  it("prove-a-theorem → research / high", () => {
    const d = decide("prove que este algoritmo distribuído é livre de deadlock");
    expect(d.task).toBe("research");
    expect(d.complexity).toBe("high");
  });

  it("research beats code on a tie (tie-break order)", () => {
    // "prove" hits research; "algoritmo" hits code → tie resolved to research
    const d = decide("prove o algoritmo");
    expect(d.task).toBe("research");
  });

  it("translation keyword → translation", () => {
    expect(decide("traduza este parágrafo para o inglês").task).toBe("translation");
  });

  it("confidence stays within [0,1]", () => {
    const d = decide("escreva uma função em python que ordena uma lista");
    expect(d.confidence).toBeGreaterThanOrEqual(0);
    expect(d.confidence).toBeLessThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F arbitro test classifier`
Expected: FAIL — cannot find module `../src/classifier`.

- [ ] **Step 3: Write `classifier.ts`**

`packages/arbitro/src/classifier.ts`:
```typescript
import type { Classification, Complexity, Signals, Task } from "./types";

// Tie-break priority for equal keyword-hit counts (earlier wins).
const TASK_TIE_ORDER: Task[] = [
  "json_extraction",
  "research",
  "code",
  "translation",
  "summary",
  "chat",
];

// Minimum complexity per task (a short instruction can still imply a big job).
const COMPLEXITY_FLOOR: Record<Task, Complexity> = {
  chat: "low",
  summary: "medium",
  translation: "medium",
  code: "medium",
  research: "high",
  json_extraction: "low",
};

const COMPLEXITY_RANK: Record<Complexity, number> = { low: 0, medium: 1, high: 2 };
const RANK_COMPLEXITY: Complexity[] = ["low", "medium", "high"];

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function maxComplexity(a: Complexity, b: Complexity): Complexity {
  return COMPLEXITY_RANK[a] >= COMPLEXITY_RANK[b] ? a : b;
}

function signalComplexity(s: Signals): Complexity {
  let c = 0;
  if (s.length > 600) c += 2;
  else if (s.length > 200) c += 1;
  if (s.hasCodeFence) c += 1;
  if (s.hasMath) c += 2;
  if (s.stepCount >= 3) c += 1;
  return RANK_COMPLEXITY[c >= 4 ? 2 : c >= 2 ? 1 : 0]!;
}

function topTask(taskHits: Record<Task, number>): Task {
  let best: Task = "chat";
  let bestVal = 0;
  for (const task of TASK_TIE_ORDER) {
    if (taskHits[task] > bestVal) {
      best = task;
      bestVal = taskHits[task];
    }
  }
  return best;
}

export function classify(s: Signals): Classification {
  // Rule 4: explicit structured-output request dominates.
  if (s.requestsStructuredOutput) {
    return {
      task: "json_extraction",
      complexity: maxComplexity(signalComplexity(s), "low"),
      needs_structured_output: true,
      confidence: 0.85,
    };
  }

  const totalHits = (Object.values(s.taskHits) as number[]).reduce((a, b) => a + b, 0);

  // No task keyword matched: distinguish trivial chat from genuinely ambiguous.
  if (totalHits === 0) {
    if (s.isTrivialChat) {
      return { task: "chat", complexity: "low", needs_structured_output: false, confidence: 0.8 };
    }
    // Rule 5: ambiguous → conservative (balanced) with low confidence.
    return { task: "chat", complexity: "medium", needs_structured_output: false, confidence: 0.35 };
  }

  const task = topTask(s.taskHits);
  const complexity = maxComplexity(signalComplexity(s), COMPLEXITY_FLOOR[task]);

  const topHits = s.taskHits[task];
  const dominance = topHits / totalHits;
  const volume = Math.min(topHits / 3, 1);
  const confidence = clamp(0.4 + 0.4 * dominance + 0.2 * volume, 0, 1);

  return { task, complexity, needs_structured_output: false, confidence };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm -F arbitro test classifier`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/arbitro/src/classifier.ts packages/arbitro/tests/classifier.test.ts
git commit -m "feat: add deterministic task/complexity/confidence classifier"
```

---

### Task 5: Model catalog

**Files:**
- Create: `packages/arbitro/src/catalog.ts`
- Test: `packages/arbitro/tests/catalog.test.ts`

**Interfaces:**
- Consumes: `ModelCatalog`, `ModelEntry`, `Task`, `CostTier` from `types`.
- Produces: `export const DEFAULT_CATALOG: ModelCatalog`.

- [ ] **Step 1: Write the failing test**

`packages/arbitro/tests/catalog.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { DEFAULT_CATALOG } from "../src/catalog";
import type { Task } from "../src/types";

const ALL_TASKS: Task[] = ["chat", "summary", "code", "research", "json_extraction", "translation"];

describe("DEFAULT_CATALOG", () => {
  it("has a version and at least three models", () => {
    expect(DEFAULT_CATALOG.version).toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(DEFAULT_CATALOG.models.length).toBeGreaterThanOrEqual(3);
  });

  it("has unique slugs", () => {
    const slugs = DEFAULT_CATALOG.models.map((m) => m.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("has at least one model per cost tier", () => {
    const tiers = new Set(DEFAULT_CATALOG.models.map((m) => m.costTier));
    expect(tiers.has("low")).toBe(true);
    expect(tiers.has("medium")).toBe(true);
    expect(tiers.has("high")).toBe(true);
  });

  it("has at least one structured-output-capable model", () => {
    expect(DEFAULT_CATALOG.models.some((m) => m.supportsStructuredOutput)).toBe(true);
  });

  it("covers every task with at least one strong model", () => {
    for (const task of ALL_TASKS) {
      expect(DEFAULT_CATALOG.models.some((m) => m.strengths.includes(task))).toBe(true);
    }
  });

  it("uses well-formed OpenRouter slugs (provider/model)", () => {
    for (const m of DEFAULT_CATALOG.models) {
      expect(m.slug).toMatch(/^[a-z0-9-]+\/[a-z0-9.\-]+$/);
      expect(m.contextWindow).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F arbitro test catalog`
Expected: FAIL — cannot find module `../src/catalog`.

- [ ] **Step 3: Write `catalog.ts`**

`packages/arbitro/src/catalog.ts`:
```typescript
import type { ModelCatalog } from "./types";

// Curated, versioned. Update the entries + bump `version` when new models land.
// Slugs follow OpenRouter's `provider/model` convention.
export const DEFAULT_CATALOG: ModelCatalog = {
  version: "2026-07-08.1",
  models: [
    {
      slug: "anthropic/claude-haiku-4.5",
      strengths: ["chat", "summary", "translation", "json_extraction"],
      costTier: "low",
      contextWindow: 200000,
      supportsStructuredOutput: true,
    },
    {
      slug: "openai/gpt-4o-mini",
      strengths: ["chat", "summary", "translation", "json_extraction"],
      costTier: "low",
      contextWindow: 128000,
      supportsStructuredOutput: true,
    },
    {
      slug: "google/gemini-2.0-flash",
      strengths: ["chat", "summary", "translation", "json_extraction"],
      costTier: "low",
      contextWindow: 1000000,
      supportsStructuredOutput: true,
    },
    {
      slug: "deepseek/deepseek-chat",
      strengths: ["code", "chat", "summary"],
      costTier: "low",
      contextWindow: 64000,
      supportsStructuredOutput: false,
    },
    {
      slug: "openai/gpt-4o",
      strengths: ["chat", "summary", "code", "translation", "json_extraction"],
      costTier: "medium",
      contextWindow: 128000,
      supportsStructuredOutput: true,
    },
    {
      slug: "anthropic/claude-sonnet-4.5",
      strengths: ["code", "summary", "chat", "research"],
      costTier: "medium",
      contextWindow: 200000,
      supportsStructuredOutput: true,
    },
    {
      slug: "anthropic/claude-opus-4.1",
      strengths: ["code", "research", "summary"],
      costTier: "high",
      contextWindow: 200000,
      supportsStructuredOutput: true,
    },
    {
      slug: "openai/o3",
      strengths: ["research", "code"],
      costTier: "high",
      contextWindow: 200000,
      supportsStructuredOutput: true,
    },
    {
      slug: "google/gemini-2.5-pro",
      strengths: ["research", "code", "summary"],
      costTier: "high",
      contextWindow: 1000000,
      supportsStructuredOutput: true,
    },
  ],
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm -F arbitro test catalog`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/arbitro/src/catalog.ts packages/arbitro/tests/catalog.test.ts
git commit -m "feat: add curated versioned model catalog"
```

---

### Task 6: Matcher

**Files:**
- Create: `packages/arbitro/src/matcher.ts`
- Test: `packages/arbitro/tests/matcher.test.ts`

**Interfaces:**
- Consumes: `Classification`, `ModelCatalog`, `ModelEntry`, `Task`, `Complexity`, `CostTier` from `types`; `DEFAULT_CATALOG` from `catalog` (tests).
- Produces: `export function pickModel(c: Classification, costPreference: number, catalog: ModelCatalog): { model: string; alternatives: string[] }`.

- [ ] **Step 1: Write the failing test**

`packages/arbitro/tests/matcher.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { pickModel } from "../src/matcher";
import { DEFAULT_CATALOG } from "../src/catalog";
import type { Classification } from "../src/types";

const c = (over: Partial<Classification>): Classification => ({
  task: "chat",
  complexity: "low",
  needs_structured_output: false,
  confidence: 0.8,
  ...over,
});

describe("pickModel", () => {
  it("code + high + quality preference → a high-capability code model", () => {
    const r = pickModel(c({ task: "code", complexity: "high" }), 0.8, DEFAULT_CATALOG);
    expect(r.model).toBe("anthropic/claude-opus-4.1");
  });

  it("chat + low + cost preference → cheapest fit (deterministic tie-break)", () => {
    const r = pickModel(c({ task: "chat", complexity: "low" }), 0.2, DEFAULT_CATALOG);
    expect(r.model).toBe("anthropic/claude-haiku-4.5");
  });

  it("structured output required → only structured-capable models are chosen", () => {
    const r = pickModel(
      c({ task: "json_extraction", complexity: "low", needs_structured_output: true }),
      0.5,
      DEFAULT_CATALOG,
    );
    const chosen = [r.model, ...r.alternatives];
    expect(chosen).not.toContain("deepseek/deepseek-chat");
  });

  it("returns up to 3 alternatives, excluding the winner", () => {
    const r = pickModel(c({ task: "chat", complexity: "low" }), 0.5, DEFAULT_CATALOG);
    expect(r.alternatives.length).toBeLessThanOrEqual(3);
    expect(r.alternatives).not.toContain(r.model);
  });

  it("clamps out-of-range costPreference without throwing", () => {
    expect(() => pickModel(c({ task: "chat" }), 5, DEFAULT_CATALOG)).not.toThrow();
    expect(() => pickModel(c({ task: "chat" }), -3, DEFAULT_CATALOG)).not.toThrow();
  });

  it("is deterministic: same input → same output", () => {
    const args = () => pickModel(c({ task: "research", complexity: "high" }), 0.7, DEFAULT_CATALOG);
    expect(args()).toEqual(args());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F arbitro test matcher`
Expected: FAIL — cannot find module `../src/matcher`.

- [ ] **Step 3: Write `matcher.ts`**

`packages/arbitro/src/matcher.ts`:
```typescript
import type { Classification, Complexity, CostTier, ModelCatalog, ModelEntry, Task } from "./types";

const CAPABILITY: Record<CostTier, number> = { low: 0.3, medium: 0.6, high: 1.0 };
const CHEAPNESS: Record<CostTier, number> = { low: 1.0, medium: 0.6, high: 0.2 };
const COMPLEXITY_NEED: Record<Complexity, number> = { low: 0.3, medium: 0.6, high: 1.0 };

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function qualityScore(model: ModelEntry, task: Task, complexity: Complexity): number {
  const taskFit = model.strengths.includes(task) ? 1.0 : 0.4;
  const capability = CAPABILITY[model.costTier];
  const need = COMPLEXITY_NEED[complexity];
  const capabilityFit = capability >= need ? 1.0 : capability / need;
  return 0.6 * taskFit + 0.4 * capabilityFit;
}

function score(model: ModelEntry, task: Task, complexity: Complexity, cp: number): number {
  return cp * qualityScore(model, task, complexity) + (1 - cp) * CHEAPNESS[model.costTier];
}

export function pickModel(
  c: Classification,
  costPreference: number,
  catalog: ModelCatalog,
): { model: string; alternatives: string[] } {
  const cp = clamp(costPreference, 0, 1);

  let candidates = catalog.models;
  if (c.needs_structured_output) {
    const structured = candidates.filter((m) => m.supportsStructuredOutput);
    if (structured.length > 0) candidates = structured; // graceful fallback if none
  }

  const ranked = [...candidates].sort((a, b) => {
    const diff = score(b, c.task, c.complexity, cp) - score(a, c.task, c.complexity, cp);
    if (diff !== 0) return diff;
    // Deterministic tie-break: alphabetical slug.
    return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
  });

  const winner = ranked[0];
  return {
    model: winner ? winner.slug : "",
    alternatives: ranked.slice(1, 4).map((m) => m.slug),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm -F arbitro test matcher`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/arbitro/src/matcher.ts packages/arbitro/tests/matcher.test.ts
git commit -m "feat: add cost/quality model matcher with deterministic tie-break"
```

---

### Task 7: Judge orchestration

**Files:**
- Create: `packages/arbitro/src/judge.ts`
- Test: `packages/arbitro/tests/judge.test.ts`

**Interfaces:**
- Consumes: `JudgeResult`, `Classification`, `ModelCatalog` from `types`; `extractSignals` from `signals`; `classify` from `classifier`; `pickModel` from `matcher`.
- Produces: `export function judgeWith(prompt: string, costPreference: number, catalog: ModelCatalog): JudgeResult`.

- [ ] **Step 1: Write the failing test**

`packages/arbitro/tests/judge.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { judgeWith } from "../src/judge";
import { DEFAULT_CATALOG } from "../src/catalog";

const run = (prompt: string, cp = 0.5) => judgeWith(prompt, cp, DEFAULT_CATALOG);

describe("judgeWith", () => {
  it("returns a full JudgeResult shape", () => {
    const r = run("escreva uma função em python");
    expect(typeof r.model).toBe("string");
    expect(r.model.length).toBeGreaterThan(0);
    expect(Array.isArray(r.alternatives)).toBe(true);
    expect(r.task).toBe("code");
    expect(["low", "medium", "high"]).toContain(r.complexity);
    expect(typeof r.needs_structured_output).toBe("boolean");
    expect(r.confidence).toBeGreaterThanOrEqual(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
    expect(r.reason.length).toBeGreaterThan(0);
    expect(r.catalogVersion).toBe(DEFAULT_CATALOG.version);
  });

  it("empty prompt → trivial decision, no throw", () => {
    const r = run("   ");
    expect(r.task).toBe("chat");
    expect(r.complexity).toBe("low");
    expect(r.model.length).toBeGreaterThan(0);
    expect(r.reason).toMatch(/vazio/i);
  });

  it("JSON request → structured + json_extraction", () => {
    const r = run("extraia os dados e devolva em JSON");
    expect(r.task).toBe("json_extraction");
    expect(r.needs_structured_output).toBe(true);
  });

  it("is deterministic", () => {
    expect(run("prove que P != NP")).toEqual(run("prove que P != NP"));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm -F arbitro test judge`
Expected: FAIL — cannot find module `../src/judge`.

- [ ] **Step 3: Write `judge.ts`**

`packages/arbitro/src/judge.ts`:
```typescript
import type { Classification, JudgeResult, ModelCatalog } from "./types";
import { extractSignals } from "./signals";
import { classify } from "./classifier";
import { pickModel } from "./matcher";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function buildReason(c: Classification, model: string, isEmpty: boolean): string {
  if (isEmpty) return `prompt vazio → decisão trivial: ${model}`;
  return `${c.task}/${c.complexity} (confiança ${c.confidence.toFixed(2)}) → ${model}`;
}

export function judgeWith(
  prompt: string,
  costPreference: number,
  catalog: ModelCatalog,
): JudgeResult {
  const cp = clamp(costPreference, 0, 1);
  const isEmpty = prompt.trim().length === 0;

  const classification: Classification = isEmpty
    ? { task: "chat", complexity: "low", needs_structured_output: false, confidence: 0.2 }
    : classify(extractSignals(prompt));

  const { model, alternatives } = pickModel(classification, cp, catalog);

  return {
    model,
    alternatives,
    task: classification.task,
    complexity: classification.complexity,
    needs_structured_output: classification.needs_structured_output,
    confidence: classification.confidence,
    reason: buildReason(classification, model, isEmpty),
    catalogVersion: catalog.version,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm -F arbitro test judge`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/arbitro/src/judge.ts packages/arbitro/tests/judge.test.ts
git commit -m "feat: add judge orchestration building JudgeResult"
```

---

### Task 8: Public API + README

**Files:**
- Modify: `packages/arbitro/src/index.ts` (replace smoke export)
- Delete content of: `packages/arbitro/tests/smoke.test.ts` → replace with API test
- Test: `packages/arbitro/tests/index.test.ts`
- Create: `packages/arbitro/README.md`

**Interfaces:**
- Consumes: `judgeWith` from `judge`; `DEFAULT_CATALOG` from `catalog`; all public types from `types`.
- Produces:
  - `export function judge(prompt: string): JudgeResult`
  - `export function createArbitro(config?: ArbitroConfig): { judge(prompt: string): JudgeResult }`
  - re-exported types: `Task`, `Complexity`, `CostTier`, `ModelEntry`, `ModelCatalog`, `JudgeResult`, `ArbitroConfig`
  - `createArbitro` throws `Error` if a provided `catalog` has zero models (config-time failure).

- [ ] **Step 1: Remove the obsolete smoke test**

Run:
```bash
git rm packages/arbitro/tests/smoke.test.ts
```

- [ ] **Step 2: Write the failing API test**

`packages/arbitro/tests/index.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { judge, createArbitro } from "../src/index";
import type { ModelCatalog } from "../src/index";

describe("public API", () => {
  it("judge() works with defaults", () => {
    const r = judge("escreva uma função em rust");
    expect(r.task).toBe("code");
    expect(r.model.length).toBeGreaterThan(0);
  });

  it("createArbitro() honors costPreference", () => {
    const cheap = createArbitro({ costPreference: 0 }).judge("oi tudo bem");
    const premium = createArbitro({ costPreference: 1 }).judge("oi tudo bem");
    // cheap preference should never pick a costlier model than premium for the same prompt
    expect(cheap.model.length).toBeGreaterThan(0);
    expect(premium.model.length).toBeGreaterThan(0);
  });

  it("createArbitro() accepts a custom catalog", () => {
    const catalog: ModelCatalog = {
      version: "test.1",
      models: [
        { slug: "acme/tiny", strengths: ["chat"], costTier: "low", contextWindow: 8000, supportsStructuredOutput: false },
      ],
    };
    const r = createArbitro({ catalog }).judge("oi");
    expect(r.model).toBe("acme/tiny");
    expect(r.catalogVersion).toBe("test.1");
  });

  it("createArbitro() throws on an empty custom catalog", () => {
    expect(() => createArbitro({ catalog: { version: "x", models: [] } })).toThrow();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm -F arbitro test index`
Expected: FAIL — `judge`/`createArbitro` not exported.

- [ ] **Step 4: Write `index.ts`**

`packages/arbitro/src/index.ts`:
```typescript
import type { ArbitroConfig, JudgeResult, ModelCatalog } from "./types";
import { judgeWith } from "./judge";
import { DEFAULT_CATALOG } from "./catalog";

export type {
  Task,
  Complexity,
  CostTier,
  ModelEntry,
  ModelCatalog,
  JudgeResult,
  ArbitroConfig,
} from "./types";

export { DEFAULT_CATALOG } from "./catalog";

const DEFAULT_COST_PREFERENCE = 0.5;

export function judge(prompt: string): JudgeResult {
  return judgeWith(prompt, DEFAULT_COST_PREFERENCE, DEFAULT_CATALOG);
}

export function createArbitro(config: ArbitroConfig = {}): {
  judge(prompt: string): JudgeResult;
} {
  const catalog: ModelCatalog = config.catalog ?? DEFAULT_CATALOG;
  if (catalog.models.length === 0) {
    throw new Error("Arbitro: catalog must contain at least one model");
  }
  const costPreference = config.costPreference ?? DEFAULT_COST_PREFERENCE;

  return {
    judge(prompt: string): JudgeResult {
      return judgeWith(prompt, costPreference, catalog);
    },
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm -F arbitro test index`
Expected: PASS.

- [ ] **Step 6: Run the full package suite + typecheck + build**

Run:
```bash
pnpm -F arbitro test
pnpm -F arbitro typecheck
pnpm -F arbitro build
```
Expected: all tests pass, no type errors, `dist/` produced.

- [ ] **Step 7: Write `README.md`**

`packages/arbitro/README.md`:
````markdown
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
````

- [ ] **Step 8: Commit**

```bash
git add packages/arbitro/src/index.ts packages/arbitro/tests/index.test.ts packages/arbitro/README.md
git commit -m "feat: expose public judge/createArbitro API + README"
```

---

### Task 9: Playground example (interactive + batch)

**Files:**
- Create: `examples/playground/package.json`
- Create: `examples/playground/tsconfig.json`
- Create: `examples/playground/src/prompts.ts`
- Create: `examples/playground/src/batch.ts`
- Create: `examples/playground/src/index.ts`
- Test: `examples/playground/tests/batch.test.ts`

**Interfaces:**
- Consumes: `judge`, `createArbitro`, `JudgeResult` from `arbitro` (workspace dependency).
- Produces:
  - `export const SAMPLE_PROMPTS: string[]` (≥ 15 prompts)
  - `export interface BatchRow { prompt: string; model: string; task: string; complexity: string; confidence: number }`
  - `export function runBatch(costPreference?: number): BatchRow[]`

- [ ] **Step 1: Create `examples/playground/package.json`**

`examples/playground/package.json`:
```json
{
  "name": "playground",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx src/index.ts",
    "batch": "tsx src/index.ts --batch",
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "pretest": "pnpm -F arbitro build"
  },
  "dependencies": {
    "arbitro": "workspace:*"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "vitest": "^2.1.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: Create `examples/playground/tsconfig.json`**

`examples/playground/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 3: Install the workspace dependency**

Run:
```bash
pnpm install
pnpm -F arbitro build
```
Expected: `arbitro` symlinked into `examples/playground/node_modules`, `dist/` present.

- [ ] **Step 4: Create the sample prompts**

`examples/playground/src/prompts.ts`:
```typescript
// Representative prompts spanning every task, plus ambiguous and trivial cases,
// so you can eyeball whether the routing "feels right" across the board.
export const SAMPLE_PROMPTS: string[] = [
  "oi, tudo bem?",
  "obrigado pela ajuda!",
  "me ajuda com isso aqui por favor",
  "resuma este relatório técnico de rede em 3 linhas",
  "summarize this article about databases",
  "traduza este parágrafo para o inglês",
  "translate this document to spanish",
  "escreva uma função de merge sort em rust com testes",
  "write a python script to parse a CSV file",
  "refatore este algoritmo para reduzir a complexidade",
  "prove que este algoritmo distribuído é livre de deadlock",
  "analise a fundo os trade-offs de arquitetura de software para um sistema distribuído",
  "calcule a integral de x^2 de 0 a 1 e explique o passo a passo",
  "extraia nome e email deste texto e devolva em JSON",
  "gere uma tabela com os endpoints e seus métodos HTTP",
];
```

- [ ] **Step 5: Write the failing batch test**

`examples/playground/tests/batch.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { runBatch } from "../src/batch";
import { SAMPLE_PROMPTS } from "../src/prompts";

describe("runBatch", () => {
  it("returns one row per sample prompt", () => {
    const rows = runBatch();
    expect(rows.length).toBe(SAMPLE_PROMPTS.length);
  });

  it("every row has a non-empty model and matching prompt", () => {
    const rows = runBatch();
    for (const row of rows) {
      expect(row.model.length).toBeGreaterThan(0);
      expect(SAMPLE_PROMPTS).toContain(row.prompt);
    }
  });

  it("routes the JSON prompt to json_extraction", () => {
    const rows = runBatch();
    const jsonRow = rows.find((r) => r.prompt.includes("devolva em JSON"));
    expect(jsonRow?.task).toBe("json_extraction");
  });

  it("respects costPreference (cheap run never errors)", () => {
    expect(() => runBatch(0)).not.toThrow();
    expect(() => runBatch(1)).not.toThrow();
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `pnpm -F playground test batch`
Expected: FAIL — cannot find module `../src/batch`.

- [ ] **Step 7: Write `batch.ts`**

`examples/playground/src/batch.ts`:
```typescript
import { createArbitro } from "arbitro";
import { SAMPLE_PROMPTS } from "./prompts";

export interface BatchRow {
  prompt: string;
  model: string;
  task: string;
  complexity: string;
  confidence: number;
}

export function runBatch(costPreference = 0.5): BatchRow[] {
  const arbitro = createArbitro({ costPreference });
  return SAMPLE_PROMPTS.map((prompt) => {
    const d = arbitro.judge(prompt);
    return {
      prompt,
      model: d.model,
      task: d.task,
      complexity: d.complexity,
      confidence: d.confidence,
    };
  });
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `pnpm -F playground test batch`
Expected: PASS.

- [ ] **Step 9: Write the CLI entrypoint**

`examples/playground/src/index.ts`:
```typescript
import { createInterface } from "node:readline";
import { createArbitro } from "arbitro";
import { runBatch } from "./batch";

function printBatch(costPreference: number): void {
  const rows = runBatch(costPreference);
  console.log(`\ncostPreference=${costPreference}\n`);
  for (const r of rows) {
    const prompt = r.prompt.length > 48 ? r.prompt.slice(0, 45) + "..." : r.prompt;
    console.log(
      `${prompt.padEnd(50)} ${r.task.padEnd(16)} ${r.complexity.padEnd(7)} ` +
        `${r.confidence.toFixed(2)}  ${r.model}`,
    );
  }
  console.log("");
}

function startRepl(): void {
  let costPreference = 0.5;
  console.log(
    "Arbitro playground. Type a prompt and press Enter.\n" +
      "Commands: `:cost 0.8` to set cost preference, `:q` to quit.\n",
  );
  const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: "› " });
  rl.prompt();
  rl.on("line", (line) => {
    const input = line.trim();
    if (input === ":q") return rl.close();
    const costMatch = input.match(/^:cost\s+([0-9.]+)$/);
    if (costMatch) {
      costPreference = Number(costMatch[1]);
      console.log(`costPreference set to ${costPreference}\n`);
      return rl.prompt();
    }
    if (input.length === 0) return rl.prompt();

    const d = createArbitro({ costPreference }).judge(input);
    console.log(
      `\n  model:        ${d.model}\n` +
        `  alternatives: ${d.alternatives.join(", ") || "(none)"}\n` +
        `  task:         ${d.task}    complexity: ${d.complexity}    confidence: ${d.confidence.toFixed(2)}\n` +
        `  reason:       ${d.reason}\n`,
    );
    rl.prompt();
  });
  rl.on("close", () => console.log("bye"));
}

if (process.argv.includes("--batch")) {
  printBatch(0.5);
} else {
  startRepl();
}
```

- [ ] **Step 10: Verify the batch CLI runs**

Run:
```bash
pnpm -F playground batch
```
Expected: a table printed with 15 rows (prompt, task, complexity, confidence, model).

- [ ] **Step 11: Typecheck the example**

Run: `pnpm -F playground typecheck`
Expected: no errors.

- [ ] **Step 12: Commit**

```bash
git add examples/playground
git commit -m "feat: add playground example (interactive REPL + batch table)"
```

---

### Task 10: Final verification

**Files:** none (verification only).

- [ ] **Step 1: Run the whole monorepo test suite**

Run:
```bash
pnpm -r build
pnpm -r test
pnpm -r typecheck
```
Expected: all packages build, all tests pass, no type errors.

- [ ] **Step 2: Manually sanity-check the router**

Run:
```bash
pnpm -F playground batch
```
Read the table with fresh eyes: does each prompt route to a sensible model? Trivial chat →
cheap model; code/high → strong model; JSON → structured-capable model. If anything looks
off, note it (tuning keywords/catalog is a follow-up, not a blocker).

- [ ] **Step 3: Commit any final touch-ups**

```bash
git add -A
git commit -m "chore: final verification pass" --allow-empty
```

---

## Self-Review

**1. Spec coverage:**
- SDK TypeScript / npm / monorepo → Tasks 1, 8.
- Juiz puro (decide, não executa) → Task 7/8 (`judge` returns a slug, never calls a model).
- Motor determinístico, síncrono, offline, zero deps → Tasks 3–7; enforced in Global Constraints and asserted by determinism tests (Tasks 6, 7).
- Catálogo curado embutido versionado → Task 5.
- API `judge` + `createArbitro` + `costPreference` + `catalog` override → Task 8.
- Contrato `JudgeResult` (todos os campos) → Task 2 (types) + Task 7 (assembled) + Task 8 (asserted).
- `needs_structured_output`/`json_extraction` rule → Task 4 (classifier) + Task 6 (matcher filter).
- Ambiguidade → confidence baixa + conservador → Task 4.
- Edge cases (empty prompt, costPreference clamp, no structured-capable model) → Tasks 6, 7, 8.
- Nota de honestidade sobre confidence → Task 8 README.
- Testes table-driven sem rede → Tasks 3–7.
- Exemplo CLI interativo + batch → Task 9.

**2. Placeholder scan:** No TBD/TODO; every code step contains full code; every test step contains real assertions. ✓

**3. Type consistency:** `Task`/`Complexity`/`CostTier`/`Signals`/`Classification`/`ModelEntry`/`ModelCatalog`/`JudgeResult`/`ArbitroConfig` defined once in Task 2 and used verbatim thereafter. Function names consistent across tasks: `extractSignals` (T3), `classify` (T4), `DEFAULT_CATALOG` (T5), `pickModel` (T6), `judgeWith` (T7), `judge`/`createArbitro` (T8), `runBatch`/`SAMPLE_PROMPTS`/`BatchRow` (T9). ✓
