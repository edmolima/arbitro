import type { CostTier } from "@edmolima/arbitro";

export function accuracy(expected: string[], predicted: string[]): number {
  if (expected.length === 0) return 1;
  let correct = 0;
  for (let i = 0; i < expected.length; i++) {
    if (expected[i] === predicted[i]) correct++;
  }
  return correct / expected.length;
}

export function recall(expected: string[], predicted: string[], positiveLabel: string): number {
  let denominator = 0;
  let numerator = 0;
  for (let i = 0; i < expected.length; i++) {
    if (expected[i] === positiveLabel) {
      denominator++;
      if (predicted[i] === positiveLabel) numerator++;
    }
  }
  if (denominator === 0) return 1;
  return numerator / denominator;
}

export function macroF1(expected: string[], predicted: string[], labels: string[]): number {
  if (labels.length === 0) return 1;
  let sum = 0;
  for (const label of labels) {
    let tp = 0;
    let fp = 0;
    let fn = 0;
    for (let i = 0; i < expected.length; i++) {
      const isExpected = expected[i] === label;
      const isPredicted = predicted[i] === label;
      if (isPredicted && isExpected) tp++;
      else if (isPredicted && !isExpected) fp++;
      else if (!isPredicted && isExpected) fn++;
    }
    const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
    const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
    const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
    sum += f1;
  }
  return sum / labels.length;
}

export interface Confusion {
  labels: string[];
  matrix: Record<string, Record<string, number>>;
}

export function confusion(expected: string[], predicted: string[], labels: string[]): Confusion {
  const matrix: Record<string, Record<string, number>> = {};
  for (const row of labels) {
    matrix[row] = {};
    for (const col of labels) matrix[row]![col] = 0;
  }
  for (let i = 0; i < expected.length; i++) {
    const e = expected[i]!;
    const p = predicted[i]!;
    if (matrix[e] && matrix[e]![p] !== undefined) matrix[e]![p]++;
  }
  return { labels, matrix };
}

export const TIER_COST: Record<CostTier, number> = { low: 1, medium: 5, high: 25 };

const TIER_RANK: Record<CostTier, number> = { low: 0, medium: 1, high: 2 };

export function simulatedCost(tiers: CostTier[]): number {
  return tiers.reduce((sum, t) => sum + TIER_COST[t], 0);
}

export function alwaysPremiumCost(n: number): number {
  return n * TIER_COST.high;
}

export interface TierError {
  underProvisionRate: number;
  overProvisionRate: number;
  weightedError: number;
}

export function tierError(expected: CostTier[], predicted: CostTier[]): TierError {
  const n = expected.length;
  if (n === 0) return { underProvisionRate: 0, overProvisionRate: 0, weightedError: 0 };
  let under = 0;
  let over = 0;
  let weighted = 0;
  // Under-provisioning (predicted below need) is a quality risk — penalized 2x the
  // money cost of over-provisioning, per the design's asymmetry.
  const UNDER_PENALTY = 2;
  const OVER_PENALTY = 1;
  for (let i = 0; i < n; i++) {
    const diff = TIER_RANK[predicted[i]!] - TIER_RANK[expected[i]!];
    if (diff < 0) {
      under++;
      weighted += UNDER_PENALTY * Math.abs(diff);
    } else if (diff > 0) {
      over++;
      weighted += OVER_PENALTY * diff;
    }
  }
  return { underProvisionRate: under / n, overProvisionRate: over / n, weightedError: weighted / n };
}
