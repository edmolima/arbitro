export type Task =
  | "chat"
  | "summary"
  | "code"
  | "research"
  | "json_extraction"
  | "translation";

export type Complexity = "low" | "medium" | "high";
export type CostTier = "low" | "medium" | "high";

export interface Signals {
  length: number;
  wordCount: number;
  hasCodeFence: boolean;
  questionCount: number;
  stepCount: number;
  hasMath: boolean;
  requestsStructuredOutput: boolean;
  isTrivialChat: boolean;
  taskHits: Record<Task, number>;
}

export interface Classification {
  task: Task;
  complexity: Complexity;
  needs_structured_output: boolean;
  confidence: number;
}

export interface ModelEntry {
  slug: string;
  strengths: Task[];
  costTier: CostTier;
  contextWindow: number;
  supportsStructuredOutput: boolean;
}

export interface ModelCatalog {
  version: string;
  models: ModelEntry[];
}

export interface JudgeResult {
  model: string;
  alternatives: string[];
  task: Task;
  complexity: Complexity;
  needs_structured_output: boolean;
  confidence: number;
  reason: string;
  catalogVersion: string;
}

export interface ArbitroConfig {
  costPreference?: number;
  catalog?: ModelCatalog;
}
