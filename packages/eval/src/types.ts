import type { Task, Complexity, CostTier } from "@edmolima/arbitro";

export interface EvalCase {
  id: string;
  prompt: string;
  lang: "pt" | "en";
  expected: {
    task: Task;
    complexity: Complexity;
    needs_structured_output: boolean;
    tier: CostTier;
  };
  tags: string[];
}

export interface EvalDataset {
  version: string;
  cases: EvalCase[];
}

export interface Prediction {
  id: string;
  task: Task;
  complexity: Complexity;
  needs_structured_output: boolean;
  model: string;
  tier: CostTier;
}
