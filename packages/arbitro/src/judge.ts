import type { Classification, JudgeResult, ModelCatalog } from "./types";
import { extractSignals } from "./signals";
import { classify } from "./classifier";
import { pickModel } from "./matcher";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function buildReason(c: Classification, model: string, isEmpty: boolean): string {
  if (isEmpty) return `prompt vazio → decisão trivial: ${model}`;
  return `${c.task}/${c.complexity} (confiança ${c.confidence.toFixed(2)}) → ${model}`;
}

export function judgeWith(
  prompt: string,
  costPreference: number,
  catalog: ModelCatalog,
): JudgeResult {
  const cp = clamp(costPreference, 0, 1);
  const isEmpty = prompt.trim().length === 0;

  const classification: Classification = isEmpty
    ? { task: "chat", complexity: "low", needs_structured_output: false, confidence: 0.2 }
    : classify(extractSignals(prompt));

  const { model, alternatives } = pickModel(classification, cp, catalog);

  return {
    model,
    alternatives,
    task: classification.task,
    complexity: classification.complexity,
    needs_structured_output: classification.needs_structured_output,
    confidence: classification.confidence,
    reason: buildReason(classification, model, isEmpty),
    catalogVersion: catalog.version,
  };
}
