# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-07-09

### Changed

- **Breaking:** `JudgeResult.model` and `JudgeResult.alternatives` are now full
  `ModelEntry` objects instead of slug strings. Use `decision.model.slug` for the
  OpenRouter call.
- **Breaking:** `JudgeResult.needs_structured_output` renamed to
  `needsStructuredOutput` (camelCase, consistent with the rest of the API).
- `reason` strings are now in English.

### Added

- `toOpenRouterBody(decision, prompt)` — a pure helper that builds the
  OpenRouter (OpenAI-compatible) chat-completion request body.

## [0.1.0] - 2026-07-09

### Added

- Initial release of `@edmolima/arbitro`: a deterministic, offline model router for
  OpenRouter. Given a prompt, `judge()` returns the best model slug, ranked
  alternatives, an inferred task/complexity, and a confidence heuristic —
  with no network calls.
- `createArbitro()` for tuning cost-vs-quality (`costPreference`) and supplying
  a custom model catalog.
- `@arbitro/eval` evaluation harness with an offline dataset and CI threshold gate.

[Unreleased]: https://github.com/edmolima/arbitro/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/edmolima/arbitro/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/edmolima/arbitro/releases/tag/v0.1.0
