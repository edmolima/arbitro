## What & why

<!-- What does this change and why? Link any related issue. -->

## Checklist

- [ ] Tests added/updated for the change
- [ ] `pnpm build && pnpm typecheck && pnpm test && pnpm eval` all pass locally
- [ ] Conventional Commit title (`feat:`, `fix:`, `docs:`, `feat!:` …)
- [ ] No new runtime dependencies in `packages/arbitro` (stays zero-dep)
- [ ] No network I/O added to the library
- [ ] If routing behavior changed, the eval metrics were reviewed intentionally
      (otherwise they are unchanged)
- [ ] CHANGELOG updated (for user-facing changes)
