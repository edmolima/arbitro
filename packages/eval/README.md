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
