---
name: Bug report
about: Report incorrect routing or a defect
title: "bug: "
labels: bug
---

## What happened

<!-- What did arbitro do? -->

## Prompt / input

```
<!-- The exact prompt or code you passed -->
```

## Expected vs actual

- **Expected:** <!-- e.g. task "code", a high-tier model -->
- **Actual:** <!-- what judge() returned -->

## Reproduction

```ts
import { judge } from "@edmolima/arbitro";
const decision = judge("...");
console.log(decision);
```

## Environment

- `@edmolima/arbitro` version:
- Node version:
