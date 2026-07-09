import type { Task, CostTier } from "arbitro";
import type { EvalDataset } from "./types";
import { predict } from "./runner";
import {
  accuracy,
  macroF1,
  confusion,
  simulatedCost,
  alwaysPremiumCost,
  tierError,
  type Confusion,
  type TierError,
} from "./metrics";

const TASK_LABELS: Task[] = ["chat", "summary", "code", "research", "json_extraction", "translation"];
const TIER_LABELS: CostTier[] = ["low", "medium", "high"];

export interface EvalReport {
  n: number;
  taskAccuracy: number;
  complexityAccuracy: number;
  structuredAccuracy: number;
  taskMacroF1: number;
  taskConfusion: Confusion;
  tierConfusion: Confusion;
  tierError: TierError;
  simulatedCost: number;
  alwaysPremiumCost: number;
  savingsPct: number;
}

export interface Thresholds {
  minTaskAccuracy: number;
  minComplexityAccuracy: number;
  minStructuredAccuracy: number;
  maxUnderProvisionRate: number;
}

export function evaluate(dataset: EvalDataset, costPreference = 0.5): EvalReport {
  const preds = predict(dataset, costPreference);
  const expTask = dataset.cases.map((c) => c.expected.task);
  const expComplexity = dataset.cases.map((c) => c.expected.complexity);
  const expStructured = dataset.cases.map((c) => String(c.expected.needs_structured_output));
  const expTier = dataset.cases.map((c) => c.expected.tier);

  const predTask = preds.map((p) => p.task);
  const predComplexity = preds.map((p) => p.complexity);
  const predStructured = preds.map((p) => String(p.needs_structured_output));
  const predTier = preds.map((p) => p.tier);

  const cost = simulatedCost(predTier);
  const premium = alwaysPremiumCost(preds.length);
  const savingsPct = premium === 0 ? 0 : ((premium - cost) / premium) * 100;

  return {
    n: preds.length,
    taskAccuracy: accuracy(expTask, predTask),
    complexityAccuracy: accuracy(expComplexity, predComplexity),
    structuredAccuracy: accuracy(expStructured, predStructured),
    taskMacroF1: macroF1(expTask, predTask, TASK_LABELS),
    taskConfusion: confusion(expTask, predTask, TASK_LABELS),
    tierConfusion: confusion(expTier, predTier, TIER_LABELS),
    tierError: tierError(expTier, predTier),
    simulatedCost: cost,
    alwaysPremiumCost: premium,
    savingsPct,
  };
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function formatReport(r: EvalReport): string {
  const lines = [
    `Arbitro eval — ${r.n} cases`,
    ``,
    `  task accuracy:        ${pct(r.taskAccuracy)}`,
    `  complexity accuracy:  ${pct(r.complexityAccuracy)}`,
    `  structured accuracy:  ${pct(r.structuredAccuracy)}`,
    `  task macro-F1:        ${r.taskMacroF1.toFixed(3)}`,
    `  under-provision rate: ${pct(r.tierError.underProvisionRate)}`,
    `  over-provision rate:  ${pct(r.tierError.overProvisionRate)}`,
    ``,
    `  simulated cost:       ${r.simulatedCost} (always-premium: ${r.alwaysPremiumCost})`,
    `  savings vs premium:   ${r.savingsPct.toFixed(1)}%`,
  ];
  return lines.join("\n");
}

export function checkThresholds(
  r: EvalReport,
  t: Thresholds,
): { passed: boolean; failures: string[] } {
  const failures: string[] = [];
  if (r.taskAccuracy < t.minTaskAccuracy)
    failures.push(`task accuracy ${pct(r.taskAccuracy)} < ${pct(t.minTaskAccuracy)}`);
  if (r.complexityAccuracy < t.minComplexityAccuracy)
    failures.push(`complexity accuracy ${pct(r.complexityAccuracy)} < ${pct(t.minComplexityAccuracy)}`);
  if (r.structuredAccuracy < t.minStructuredAccuracy)
    failures.push(`structured accuracy ${pct(r.structuredAccuracy)} < ${pct(t.minStructuredAccuracy)}`);
  if (r.tierError.underProvisionRate > t.maxUnderProvisionRate)
    failures.push(`under-provision rate ${pct(r.tierError.underProvisionRate)} > ${pct(t.maxUnderProvisionRate)}`);
  return { passed: failures.length === 0, failures };
}
