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

## Releasing (maintainers)

The package `@edmolima/arbitro` is published to GitHub Packages by the
[`publish` workflow](./.github/workflows/publish.yml), which runs automatically
when a `v*.*.*` tag is pushed (or a GitHub Release is published). To cut a
release:

1. Bump `version` in `packages/arbitro/package.json`.
2. Move the changes under `## [Unreleased]` in `CHANGELOG.md` into a new version
   section with today's date.
3. Commit both: `git commit -am "chore: release vX.Y.Z"`.
4. Tag and push — the tag must match the new version:

   ```bash
   git tag vX.Y.Z
   git push origin main vX.Y.Z
   ```

5. Watch the run under **Actions → Publish**. On success the package appears at
   `https://github.com/edmolima?tab=packages`.

Publishing uses the workflow's `GITHUB_TOKEN` (`packages: write`) — no personal
token or npm login is needed. If publish fails with a permissions error, check
**Settings → Actions → General → Workflow permissions** is set to
"Read and write permissions".

## Code of Conduct

By participating, you agree to abide by our
[Code of Conduct](./CODE_OF_CONDUCT.md).
