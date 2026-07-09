import { describe, it, expect } from "vitest";
import {
  accuracy,
  macroF1,
  confusion,
  simulatedCost,
  alwaysPremiumCost,
  tierError,
  TIER_COST,
} from "../src/metrics";
import type { CostTier } from "arbitro";

describe("accuracy", () => {
  it("is the fraction of exact matches", () => {
    expect(accuracy(["a", "b", "c", "d"], ["a", "b", "x", "d"])).toBe(0.75);
  });
  it("is 1 for empty input (vacuously)", () => {
    expect(accuracy([], [])).toBe(1);
  });
});

describe("macroF1", () => {
  it("is 1 for a perfect prediction", () => {
    expect(macroF1(["a", "b", "a"], ["a", "b", "a"], ["a", "b"])).toBe(1);
  });
  it("averages per-class F1, counting a never-predicted class as 0", () => {
    // expected has a,b,c; predictions get a right, b right, c wrong (predicted a)
    const f1 = macroF1(["a", "b", "c"], ["a", "b", "a"], ["a", "b", "c"]);
    // class a: tp=1, fp=1, fn=0 → P=0.5 R=1 F1=0.667; b: perfect F1=1; c: tp=0 → F1=0
    expect(f1).toBeCloseTo((2 / 3 + 1 + 0) / 3, 5);
  });
});

describe("confusion", () => {
  it("counts expected→predicted pairs over the given labels", () => {
    const c = confusion(["a", "a", "b"], ["a", "b", "b"], ["a", "b"]);
    expect(c.matrix.a!.a).toBe(1);
    expect(c.matrix.a!.b).toBe(1);
    expect(c.matrix.b!.b).toBe(1);
    expect(c.matrix.b!.a).toBe(0);
  });
});

describe("cost simulation", () => {
  it("sums the tier cost proxy", () => {
    const tiers: CostTier[] = ["low", "medium", "high"];
    expect(simulatedCost(tiers)).toBe(TIER_COST.low + TIER_COST.medium + TIER_COST.high);
    expect(simulatedCost(tiers)).toBe(1 + 5 + 25);
  });
  it("always-premium cost is n * high tier", () => {
    expect(alwaysPremiumCost(3)).toBe(3 * TIER_COST.high);
  });
});

describe("tierError", () => {
  it("separates under- and over-provisioning", () => {
    // expected: [high, low, medium], predicted: [medium, low, high]
    // case 0: predicted below expected → under; case 1: exact; case 2: predicted above → over
    const e: CostTier[] = ["high", "low", "medium"];
    const p: CostTier[] = ["medium", "low", "high"];
    const r = tierError(e, p);
    expect(r.underProvisionRate).toBeCloseTo(1 / 3, 5);
    expect(r.overProvisionRate).toBeCloseTo(1 / 3, 5);
    expect(r.weightedError).toBeGreaterThan(0);
  });
  it("is zero error for exact tier matches", () => {
    const t: CostTier[] = ["low", "medium", "high"];
    const r = tierError(t, t);
    expect(r.underProvisionRate).toBe(0);
    expect(r.overProvisionRate).toBe(0);
    expect(r.weightedError).toBe(0);
  });
});
