import type { ArbitroConfig, JudgeResult, ModelCatalog } from "./types";
import { judgeWith } from "./judge";
import { DEFAULT_CATALOG } from "./catalog";

export type {
  Task,
  Complexity,
  CostTier,
  ModelEntry,
  ModelCatalog,
  JudgeResult,
  ArbitroConfig,
} from "./types";

export { DEFAULT_CATALOG } from "./catalog";

export { toOpenRouterBody } from "./openrouter";
export type { OpenRouterBody, OpenRouterMessage } from "./openrouter";

const DEFAULT_COST_PREFERENCE = 0.5;

export function judge(prompt: string): JudgeResult {
  return judgeWith(prompt, DEFAULT_COST_PREFERENCE, DEFAULT_CATALOG);
}

export function createArbitro(config: ArbitroConfig = {}): {
  judge(prompt: string): JudgeResult;
} {
  const catalog: ModelCatalog = config.catalog ?? DEFAULT_CATALOG;
  if (catalog.models.length === 0) {
    throw new Error("Arbitro: catalog must contain at least one model");
  }
  const costPreference = config.costPreference ?? DEFAULT_COST_PREFERENCE;

  return {
    judge(prompt: string): JudgeResult {
      return judgeWith(prompt, costPreference, catalog);
    },
  };
}
