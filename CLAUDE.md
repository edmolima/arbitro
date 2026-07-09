# CLAUDE.md

This project's agent guidance lives in [AGENTS.md](./AGENTS.md) — read it before
making changes. It covers the repository layout, commands, conventions, the release
flow, and the hard **Boundaries** (zero runtime deps, no network in the library,
behavior-preserving routing verified by `pnpm eval`).

Quick reference:

```bash
pnpm build && pnpm typecheck && pnpm test && pnpm eval   # the full gate — all must pass
```
