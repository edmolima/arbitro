import { createArbitro } from "@edmolima/arbitro";
import { SAMPLE_PROMPTS } from "./prompts";

export interface BatchRow {
  prompt: string;
  model: string;
  task: string;
  complexity: string;
  confidence: number;
}

export function runBatch(costPreference = 0.5): BatchRow[] {
  const arbitro = createArbitro({ costPreference });
  return SAMPLE_PROMPTS.map((prompt) => {
    const d = arbitro.judge(prompt);
    return {
      prompt,
      model: d.model.slug,
      task: d.task,
      complexity: d.complexity,
      confidence: d.confidence,
    };
  });
}
