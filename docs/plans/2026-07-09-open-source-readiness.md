# Open-Source Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `arbitro` monorepo presentable as an open-source project and remove internal Superpowers/SDD process artifacts, preserving design history under `docs/`.

**Architecture:** Pure repository scaffolding — file moves, deletions, JSON metadata edits, and new Markdown/YAML docs. No runtime source changes except normalizing Portuguese example strings in READMEs to English. Verification is JSON/YAML validity, link resolution, and the existing `build/typecheck/test/eval` pipeline still passing.

**Tech Stack:** pnpm workspaces, TypeScript, GitHub Actions, Markdown.

## Global Constraints

- Repo: `github.com/edmolima/arbitro` — every URL uses this namespace verbatim.
- License: `MIT`, `Copyright (c) 2026 Edmo Lima`.
- Author: `Edmo Lima <edmo.lima@afparcapital.com>`.
- Docs language: English (README + community files); code/API surface unchanged.
- pnpm version pin: `pnpm@10.33.0` (from root `package.json` `packageManager`).
- Node floor: `>=18`.
- Commit style: Conventional Commits (matches existing history).

---

### Task 1: Reorganize docs and remove internal process artifacts

**Files:**
- Move: `docs/superpowers/specs/2026-07-08-arbitro-model-router-design.md` → `docs/specs/`
- Move: `docs/superpowers/specs/2026-07-09-arbitro-eval-harness-design.md` → `docs/specs/`
- Move: `docs/superpowers/plans/2026-07-08-arbitro-model-router.md` → `docs/plans/`
- Move: `docs/superpowers/plans/2026-07-09-arbitro-eval-harness.md` → `docs/plans/`
- Delete: `docs/superpowers/` (after moves), `.superpowers/` (git-tracked)
- Modify: `.gitignore`

Note: `docs/specs/2026-07-09-open-source-readiness-design.md` and this plan already live in the new locations — do not move them.

- [ ] **Step 1: Move the existing specs and plans up one level**

```bash
cd /Users/edmolima/Workspace/Dataqore/arbitro
git mv docs/superpowers/specs/2026-07-08-arbitro-model-router-design.md docs/specs/
git mv docs/superpowers/specs/2026-07-09-arbitro-eval-harness-design.md docs/specs/
git mv docs/superpowers/plans/2026-07-08-arbitro-model-router.md docs/plans/
git mv docs/superpowers/plans/2026-07-09-arbitro-eval-harness.md docs/plans/
rmdir docs/superpowers/specs docs/superpowers/plans docs/superpowers
```

- [ ] **Step 2: Remove the internal `.superpowers/` directory from version control**

```bash
git rm -r --quiet .superpowers
```

- [ ] **Step 3: Add `.superpowers/` to `.gitignore`**

Append to `.gitignore` so the final file reads:

```
node_modules/
dist/
*.log
.DS_Store
.superpowers/
```

- [ ] **Step 4: Verify nothing internal remains tracked**

Run: `git ls-files | grep -E '^\.superpowers/|^docs/superpowers/' || echo CLEAN`
Expected: `CLEAN`

Run: `ls docs/specs docs/plans`
Expected: three specs (model-router, eval-harness, open-source-readiness) + three plans (model-router, eval-harness, open-source-readiness).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: relocate design docs to docs/ and drop internal SDD artifacts

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Add package metadata for publishing

**Files:**
- Modify: `packages/arbitro/package.json`
- Modify: `package.json` (root)

- [ ] **Step 1: Add metadata fields to `packages/arbitro/package.json`**

Insert after the existing `"description"` line, and add `license`, `author`, `keywords`, `repository`, `homepage`, `bugs`. Result (fields shown in place; keep all existing fields — `main`, `module`, `types`, `exports`, `files`, `sideEffects`, `engines`, `scripts`, `devDependencies` — unchanged):

```json
{
  "name": "arbitro",
  "version": "0.1.0",
  "description": "Deterministic model router — picks the best OpenRouter model for a prompt before you call it.",
  "license": "MIT",
  "author": "Edmo Lima <edmo.lima@afparcapital.com>",
  "keywords": [
    "openrouter",
    "llm",
    "model-router",
    "routing",
    "ai",
    "deterministic",
    "cost-optimization"
  ],
  "repository": {
    "type": "git",
    "url": "git+https://github.com/edmolima/arbitro.git",
    "directory": "packages/arbitro"
  },
  "homepage": "https://github.com/edmolima/arbitro#readme",
  "bugs": {
    "url": "https://github.com/edmolima/arbitro/issues"
  },
  "type": "module"
}
```

- [ ] **Step 2: Add `license` and `repository` to root `package.json`**

Add after `"private": true`:

```json
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/edmolima/arbitro.git"
  },
```

- [ ] **Step 3: Verify JSON validity**

Run: `node -e "require('./package.json'); require('./packages/arbitro/package.json'); console.log('valid')"`
Expected: `valid`

- [ ] **Step 4: Commit**

```bash
git add package.json packages/arbitro/package.json
git commit -m "chore: add license, author, and repository metadata

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Add license and community files

**Files:**
- Create: `LICENSE`
- Create: `CONTRIBUTING.md`
- Create: `CODE_OF_CONDUCT.md`
- Create: `CHANGELOG.md`

- [ ] **Step 1: Create `LICENSE` (MIT)**

```
MIT License

Copyright (c) 2026 Edmo Lima

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Create `CONTRIBUTING.md`**

```markdown
# Contributing to arbitro

Thanks for your interest in improving arbitro! This document explains how to
set up the project and get a change merged.

## Prerequisites

- Node.js >= 18
- [pnpm](https://pnpm.io) 10.33.0 (the repo pins this via `packageManager`)

## Setup

```bash
git clone https://github.com/edmolima/arbitro.git
cd arbitro
pnpm install
```

## Monorepo layout

| Path                   | What it is                                             |
| ---------------------- | ------------------------------------------------------ |
| `packages/arbitro`     | The published library — the deterministic router.      |
| `packages/eval`        | Offline evaluation harness with a CI threshold gate.   |
| `examples/playground`  | A runnable example app that exercises the router.      |

## Common commands

Run these from the repo root:

```bash
pnpm build       # build all packages
pnpm test        # run all test suites
pnpm typecheck   # type-check all packages
pnpm eval        # run the evaluation harness (offline, gated)
```

## Making a change

1. Create a branch off `main`.
2. Add or update tests for your change — arbitro is test-driven.
3. Make sure `pnpm build && pnpm typecheck && pnpm test && pnpm eval` all pass.
4. Use [Conventional Commits](https://www.conventionalcommits.org) for messages
   (e.g. `feat:`, `fix:`, `chore:`, `docs:`).
5. Open a pull request against `main` with a clear description.

## Code of Conduct

By participating, you agree to abide by our
[Code of Conduct](./CODE_OF_CONDUCT.md).
```

- [ ] **Step 3: Create `CODE_OF_CONDUCT.md`**

Use the **Contributor Covenant v2.1** verbatim (canonical text:
https://www.contributor-covenant.org/version/2/1/code_of_conduct/code_of_conduct.md).
In the "Enforcement" section, set the reporting contact to
`edmo.lima@afparcapital.com`. Do not paraphrase — copy the standard text and fill
only the contact placeholder.

- [ ] **Step 4: Create `CHANGELOG.md`**

```markdown
# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-07-09

### Added

- Initial release of `arbitro`: a deterministic, offline model router for
  OpenRouter. Given a prompt, `judge()` returns the best model slug, ranked
  alternatives, an inferred task/complexity, and a confidence heuristic —
  with no network calls.
- `createArbitro()` for tuning cost-vs-quality (`costPreference`) and supplying
  a custom model catalog.
- `@arbitro/eval` evaluation harness with an offline dataset and CI threshold gate.

[Unreleased]: https://github.com/edmolima/arbitro/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/edmolima/arbitro/releases/tag/v0.1.0
```

- [ ] **Step 5: Verify links resolve**

Run: `test -f LICENSE && test -f CONTRIBUTING.md && test -f CODE_OF_CONDUCT.md && test -f CHANGELOG.md && echo OK`
Expected: `OK`
Confirm `CONTRIBUTING.md`'s link `./CODE_OF_CONDUCT.md` points at an existing file.

- [ ] **Step 6: Commit**

```bash
git add LICENSE CONTRIBUTING.md CODE_OF_CONDUCT.md CHANGELOG.md
git commit -m "docs: add license, contributing, code of conduct, and changelog

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Add CI workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20]
    steps:
      - uses: actions/checkout@v4

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10.33.0

      - name: Set up Node ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      - name: Typecheck
        run: pnpm typecheck

      - name: Test
        run: pnpm test

      - name: Eval gate
        run: pnpm eval
```

- [ ] **Step 2: Verify YAML validity**

Run: `node -e "const fs=require('fs');const s=fs.readFileSync('.github/workflows/ci.yml','utf8');if(!s.includes('pnpm install --frozen-lockfile'))process.exit(1);console.log('ok')"`
Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add GitHub Actions build/test/typecheck/eval workflow

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Write root README and normalize package README to English

**Files:**
- Create: `README.md`
- Modify: `packages/arbitro/README.md`

- [ ] **Step 1: Create the root `README.md`**

```markdown
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
```

- [ ] **Step 2: Normalize Portuguese examples in `packages/arbitro/README.md`**

Replace the Portuguese prompt strings and `reason` text with English, keeping
all code/API identical. Specifically:
- `"escreva uma função de merge sort em rust com testes"` → `"write a merge sort function in rust with tests"` (both occurrences, lines ~18 and ~46).
- The comment `//   reason: "code/medium (confiança 0.93) → deepseek/deepseek-chat",` → `//   reason: "code/medium (confidence 0.93) → deepseek/deepseek-chat",`.
- `cheap.judge("resuma este texto").model;` → `cheap.judge("summarize this text").model;`

- [ ] **Step 3: Verify no Portuguese prompt strings remain**

Run: `grep -rniE "escreva|resuma|confian" README.md packages/arbitro/README.md || echo CLEAN`
Expected: `CLEAN`

- [ ] **Step 4: Commit**

```bash
git add README.md packages/arbitro/README.md
git commit -m "docs: add root README and normalize examples to English

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Full-pipeline verification

- [ ] **Step 1: Clean install and run the full gate**

Run:
```bash
pnpm install --frozen-lockfile && pnpm build && pnpm typecheck && pnpm test && pnpm eval
```
Expected: all steps pass (exit 0), eval threshold gate green.

- [ ] **Step 2: Final tracked-files audit**

Run: `git ls-files | grep -E '^\.superpowers/|^docs/superpowers/' || echo CLEAN`
Expected: `CLEAN`

Run: `git status --short`
Expected: clean working tree (all work committed).
```
