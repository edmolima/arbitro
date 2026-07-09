import { createArbitro, DEFAULT_CATALOG } from "@edmolima/arbitro";
import type { CostTier } from "@edmolima/arbitro";
import type { EvalDataset, Prediction } from "./types";

const SLUG_TIER: Record<string, CostTier> = Object.fromEntries(
  DEFAULT_CATALOG.models.map((m) => [m.slug, m.costTier]),
);

export function predict(dataset: EvalDataset, costPreference = 0.5): Prediction[] {
  const arbitro = createArbitro({ costPreference });
  return dataset.cases.map((c) => {
    const d = arbitro.judge(c.prompt);
    const tier = SLUG_TIER[d.model];
    if (tier === undefined) {
      throw new Error(`arbitro returned model "${d.model}" not present in DEFAULT_CATALOG`);
    }
    return {
      id: c.id,
      task: d.task,
      complexity: d.complexity,
      needs_structured_output: d.needs_structured_output,
      model: d.model,
      tier,
    };
  });
}
