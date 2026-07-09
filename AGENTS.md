# AGENTS.md

Guidance for AI coding agents (and humans) working in this repository. This file
follows the [agents.md](https://agents.md) convention. Read it before making changes.

## What this project is

`@edmolima/arbitro` is a **deterministic, offline model router**. Given a prompt,
`judge()` returns the best OpenRouter model to use — with **no network calls and no
runtime dependencies**. The routing is pure and reproducible: same input → same output.

## Repository layout

| Path                    | Package            | What it is                                             |
| ----------------------- | ------------------ | ------------------------------------------------------ |
| `packages/arbitro`      | `@edmolima/arbitro`| The published library — the router. Zero-dependency.   |
| `packages/eval`         | `@arbitro/eval`    | Offline evaluation harness with a CI threshold gate. Private. |
| `examples/playground`   | `playground`       | Runnable example that exercises the router. Private.   |
| `docs/specs`, `docs/plans` | —               | Design specs and implementation plans (history).       |

- Node.js **>= 18**, package manager **pnpm 10.33.0** (pinned via `packageManager`).
- TypeScript, ESM, built with `tsup`, tested with `vitest`.

## Commands (run from repo root)

```bash
pnpm install                 # install workspace deps
pnpm build                   # build all packages (tsup)
pnpm typecheck               # tsc --noEmit across packages
pnpm test                    # vitest run across packages
pnpm eval                    # run the eval harness — MUST stay green (CI gate)
pnpm -F playground openrouter "your prompt"   # end-to-end OpenRouter example (needs a key)
```

Before proposing any change complete, all four must pass:
`pnpm build && pnpm typecheck && pnpm test && pnpm eval`.

## Conventions

- **Commits:** [Conventional Commits](https://www.conventionalcommits.org)
  (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `feat!:` for breaking).
- **TDD:** write the failing test first, then the minimal implementation.
- **Public API is camelCase** (`needsStructuredOutput`, `catalogVersion`, `costPreference`).
- **English** for all code comments, docs, and the runtime `reason` string.
- Keep files small and single-purpose; follow the patterns already in `packages/arbitro/src`.

## Workflow for a change

1. Create a branch off `main`.
2. Add/adjust tests, implement, and make the full gate pass.
3. Commit with a Conventional Commit message.
4. Open a PR against `main`. CI (Node 18 & 20) runs `build → typecheck → test → eval`.

## Releasing

Publishing to GitHub Packages is triggered by pushing a `v*.*.*` tag (see
[CONTRIBUTING.md](./CONTRIBUTING.md#releasing-maintainers)). Do **not** publish by hand.

## Boundaries — what you MUST NOT do

These are hard rules. Violating them breaks the project's core guarantees.

- **Do NOT add runtime dependencies to `packages/arbitro`.** The library is
  zero-dependency by design. `dependencies` in its `package.json` must stay empty.
- **Do NOT introduce any network I/O, filesystem access, or async work into the
  library.** `judge()`/`createArbitro()` are pure, synchronous, and offline. Helpers
  like `toOpenRouterBody` only build data — they never send it.
- **Do NOT change routing behavior without re-running `pnpm eval`.** The eval
  metrics (task/complexity/structured accuracy, tier error, savings) are a
  behavior contract. If a refactor is meant to be behavior-preserving, the numbers
  must be identical. If a change intentionally shifts them, say so explicitly and
  update the thresholds deliberately.
- **Do NOT bump the version or publish** outside the tag-based release flow.
- **Do NOT commit secrets** — API keys, tokens, `.env` files. `OPENROUTER_API_KEY`
  is read from the environment only.
- **Do NOT rename the eval dataset's domain keys.** `packages/eval` deliberately
  uses `needs_structured_output` in its dataset/`Prediction` types; that is its own
  schema, separate from the library's public camelCase API. Leave it as-is.
- **Do NOT "clean up" or refactor code unrelated to your task.** Stay surgical.
- **Do NOT delete or edit design docs** under `docs/` to make history "tidier".
