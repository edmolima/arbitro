import type { Classification, JudgeResult, ModelCatalog, ModelEntry } from "./types";
import { extractSignals } from "./signals";
import { classify } from "./classifier";
import { pickModel } from "./matcher";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function buildReason(c: Classification, model: ModelEntry, isEmpty: boolean): string {
  if (isEmpty) return `empty prompt → trivial decision: ${model.slug}`;
  return `${c.task}/${c.complexity} (confidence ${c.confidence.toFixed(2)}) → ${model.slug}`;
}

export function judgeWith(
  prompt: string,
  costPreference: number,
  catalog: ModelCatalog,
): JudgeResult {
  const cp = clamp(costPreference, 0, 1);
  const isEmpty = prompt.trim().length === 0;

  const classification: Classification = isEmpty
    ? { task: "chat", complexity: "low", needsStructuredOutput: false, confidence: 0.2 }
    : classify(extractSignals(prompt));

  const { model, alternatives } = pickModel(classification, cp, catalog);

  return {
    model,
    alternatives,
    task: classification.task,
    complexity: classification.complexity,
    needsStructuredOutput: classification.needsStructuredOutput,
    confidence: classification.confidence,
    reason: buildReason(classification, model, isEmpty),
    catalogVersion: catalog.version,
  };
}
