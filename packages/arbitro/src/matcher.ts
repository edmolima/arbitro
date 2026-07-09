import type { Classification, Complexity, CostTier, ModelCatalog, ModelEntry, Task } from "./types";

const CAPABILITY: Record<CostTier, number> = { low: 0.3, medium: 0.6, high: 1.0 };
const CHEAPNESS: Record<CostTier, number> = { low: 1.0, medium: 0.6, high: 0.2 };
const COMPLEXITY_NEED: Record<Complexity, number> = { low: 0.3, medium: 0.6, high: 1.0 };

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function qualityScore(model: ModelEntry, task: Task, complexity: Complexity): number {
  const taskFit = model.strengths.includes(task) ? 1.0 : 0.4;
  const capability = CAPABILITY[model.costTier];
  const need = COMPLEXITY_NEED[complexity];
  const capabilityFit = capability >= need ? 1.0 : capability / need;
  return 0.6 * taskFit + 0.4 * capabilityFit;
}

function score(model: ModelEntry, task: Task, complexity: Complexity, cp: number): number {
  return cp * qualityScore(model, task, complexity) + (1 - cp) * CHEAPNESS[model.costTier];
}

export function pickModel(
  c: Classification,
  costPreference: number,
  catalog: ModelCatalog,
): { model: ModelEntry; alternatives: ModelEntry[] } {
  const cp = clamp(costPreference, 0, 1);

  let candidates = catalog.models;
  if (c.needsStructuredOutput) {
    const structured = candidates.filter((m) => m.supportsStructuredOutput);
    if (structured.length > 0) candidates = structured; // graceful fallback if none
  }

  const ranked = [...candidates].sort((a, b) => {
    const diff = score(b, c.task, c.complexity, cp) - score(a, c.task, c.complexity, cp);
    if (diff !== 0) return diff;
    // Deterministic tie-break: alphabetical slug.
    return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0;
  });

  const fallback: ModelEntry = {
    slug: "",
    strengths: [],
    costTier: "low",
    contextWindow: 0,
    supportsStructuredOutput: false,
  };
  return {
    model: ranked[0] ?? fallback,
    alternatives: ranked.slice(1, 4),
  };
}
