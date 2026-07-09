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
