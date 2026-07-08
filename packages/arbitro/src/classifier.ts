import type { Classification, Complexity, Signals, Task } from "./types";

// Tie-break priority for equal keyword-hit counts (earlier wins).
const TASK_TIE_ORDER: Task[] = [
  "json_extraction",
  "research",
  "code",
  "translation",
  "summary",
  "chat",
];

// Minimum complexity per task (a short instruction can still imply a big job).
const COMPLEXITY_FLOOR: Record<Task, Complexity> = {
  chat: "low",
  summary: "medium",
  translation: "medium",
  code: "medium",
  research: "high",
  json_extraction: "low",
};

const COMPLEXITY_RANK: Record<Complexity, number> = { low: 0, medium: 1, high: 2 };
const RANK_COMPLEXITY: Complexity[] = ["low", "medium", "high"];

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function maxComplexity(a: Complexity, b: Complexity): Complexity {
  return COMPLEXITY_RANK[a] >= COMPLEXITY_RANK[b] ? a : b;
}

function signalComplexity(s: Signals): Complexity {
  let c = 0;
  if (s.length > 600) c += 2;
  else if (s.length > 200) c += 1;
  if (s.hasCodeFence) c += 1;
  if (s.hasMath) c += 2;
  if (s.stepCount >= 3) c += 1;
  return RANK_COMPLEXITY[c >= 4 ? 2 : c >= 2 ? 1 : 0]!;
}

function topTask(taskHits: Record<Task, number>): Task {
  let best: Task = "chat";
  let bestVal = 0;
  for (const task of TASK_TIE_ORDER) {
    if (taskHits[task] > bestVal) {
      best = task;
      bestVal = taskHits[task];
    }
  }
  return best;
}

export function classify(s: Signals): Classification {
  // Rule 4: explicit structured-output request dominates.
  if (s.requestsStructuredOutput) {
    return {
      task: "json_extraction",
      complexity: maxComplexity(signalComplexity(s), "low"),
      needs_structured_output: true,
      confidence: 0.85,
    };
  }

  const totalHits = (Object.values(s.taskHits) as number[]).reduce((a, b) => a + b, 0);

  // No task keyword matched: distinguish trivial chat from genuinely ambiguous.
  if (totalHits === 0) {
    if (s.isTrivialChat) {
      return { task: "chat", complexity: "low", needs_structured_output: false, confidence: 0.8 };
    }
    // Rule 5: ambiguous → conservative (balanced) with low confidence.
    return { task: "chat", complexity: "medium", needs_structured_output: false, confidence: 0.35 };
  }

  const task = topTask(s.taskHits);
  const complexity = maxComplexity(signalComplexity(s), COMPLEXITY_FLOOR[task]);

  const topHits = s.taskHits[task];
  const dominance = topHits / totalHits;
  const volume = Math.min(topHits / 3, 1);
  const confidence = clamp(0.4 + 0.4 * dominance + 0.2 * volume, 0, 1);

  return { task, complexity, needs_structured_output: false, confidence };
}
