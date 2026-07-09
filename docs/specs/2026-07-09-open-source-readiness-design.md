# Open-Source Readiness — Design Spec

**Date:** 2026-07-09
**Status:** Approved
**Repo:** github.com/edmolima/arbitro
**License:** MIT · **Author:** Edmo Lima <edmo.lima@afparcapital.com> · **Docs language:** English

## Goal

Turn the `arbitro` monorepo into a presentable open-source project and remove the
internal Superpowers/SDD process artifacts from the repository, while preserving the
design history (specs + plans) as public documentation.

## Non-Goals (deferred)

- Issue/PR templates
- `SECURITY.md`
- npm publish workflow / release automation
- Badges beyond CI + license

## 1. Reorganization & Cleanup

- Move `docs/superpowers/specs/*` → `docs/specs/` (this file lives here).
- Move `docs/superpowers/plans/*` → `docs/plans/`.
- Remove the now-empty `docs/superpowers/` directory.
- `git rm -r .superpowers/` — remove internal SDD diffs/reports/briefs from version control.
- Add `.superpowers/` to `.gitignore` so it does not reappear.

**Acceptance:** `docs/superpowers/` and `.superpowers/` no longer exist in `git ls-files`;
`docs/specs/` and `docs/plans/` contain the moved files; `.superpowers/` present in
`.gitignore`.

## 2. License & Community Files (repo root)

- `LICENSE` — MIT, `Copyright (c) 2026 Edmo Lima`.
- `CONTRIBUTING.md` — prerequisites (Node ≥18, pnpm), `pnpm install`, the four scripts
  (`build`, `test`, `typecheck`, `eval`), monorepo layout, commit convention
  (Conventional Commits, matching existing history), PR flow, link to Code of Conduct.
- `CODE_OF_CONDUCT.md` — Contributor Covenant 2.1, contact = author email.
- `CHANGELOG.md` — Keep a Changelog format; `0.1.0` section describing the initial
  `arbitro` router release.

**Acceptance:** all four files exist at root; links between them resolve; script names
match `package.json`.

## 3. package.json Metadata

`packages/arbitro/package.json` — add:
- `"license": "MIT"`
- `"author": "Edmo Lima <edmo.lima@afparcapital.com>"`
- `"repository": { "type": "git", "url": "git+https://github.com/edmolima/arbitro.git", "directory": "packages/arbitro" }`
- `"homepage": "https://github.com/edmolima/arbitro#readme"`
- `"bugs": { "url": "https://github.com/edmolima/arbitro/issues" }`
- `"keywords": ["openrouter", "llm", "model-router", "routing", "ai", "deterministic", "cost-optimization"]`

Root `package.json` — add `"license": "MIT"` and the `repository` object (no `directory`).

**Acceptance:** `pnpm -F arbitro pack --dry-run` (or equivalent) shows the metadata;
`package.json` files remain valid JSON; existing fields untouched.

## 4. CI — GitHub Actions

`.github/workflows/ci.yml`:
- Triggers: `push` and `pull_request` on `main`.
- Job matrix: Node 18 and 20.
- Steps: checkout → `pnpm/action-setup` (pin to `packageManager` version 10.33.0) →
  `actions/setup-node` with `cache: pnpm` → `pnpm install --frozen-lockfile` →
  `pnpm build` → `pnpm typecheck` → `pnpm test` → `pnpm eval`.

**Acceptance:** workflow YAML is valid; step commands match root `package.json` scripts;
uses the repo's pinned pnpm version.

## 5. README (repo root)

`README.md`:
- Title, one-line description, CI badge, license badge.
- What it is / why (deterministic, offline, zero decision-cost).
- Install + quickstart, **examples normalized to English**.
- Cost-vs-quality tuning example.
- Monorepo structure table (`packages/arbitro`, `packages/eval`, `examples/playground`).
- Contributing link, license line.

Also normalize the Portuguese examples in `packages/arbitro/README.md` to English for
consistency (the API surface and code stay identical; only prompt strings/comments change).

**Acceptance:** root `README.md` renders; badge URLs point at `edmolima/arbitro`; code
examples compile against the current public API (`judge`, `createArbitro`); no Portuguese
prompt strings remain in either README.

## Verification (whole change)

1. `git ls-files | grep -E '^\.superpowers/|^docs/superpowers/'` returns nothing.
2. `pnpm install --frozen-lockfile && pnpm build && pnpm typecheck && pnpm test && pnpm eval` pass.
3. All new root files present; internal links resolve.
