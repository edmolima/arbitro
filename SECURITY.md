# Security Policy

## Supported versions

arbitro is pre-1.0. Security fixes are applied to the latest released minor version
only.

| Version | Supported |
| ------- | --------- |
| 0.2.x   | ✅        |
| < 0.2   | ❌        |

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report privately through one of:

- GitHub's [private vulnerability reporting](https://github.com/edmolima/arbitro/security/advisories/new)
  (Security → Report a vulnerability), or
- email **edmo.lima@afparcapital.com** with the details and steps to reproduce.

What to expect:

- Acknowledgement within **3 business days**.
- An assessment and, if confirmed, a fix plan with a target timeline.
- Credit in the release notes once a fix ships, unless you prefer to remain anonymous.

## Scope notes

arbitro is a pure, offline library: it performs no network calls, reads no files, and
has no runtime dependencies. The most relevant concerns are therefore in downstream
usage — e.g. how you handle your `OPENROUTER_API_KEY` and the responses you get back
from OpenRouter. Never commit API keys; arbitro reads them from the environment only.
