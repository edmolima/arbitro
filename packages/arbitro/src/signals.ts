import type { Signals, Task } from "./types";
import {
  TASK_KEYWORDS,
  STRUCTURED_PATTERNS,
  MATH_PATTERNS,
  TRIVIAL_CHAT,
} from "./keywords";

const TASKS = Object.keys(TASK_KEYWORDS) as Task[];

export function extractSignals(prompt: string): Signals {
  const text = prompt;
  const trimmed = prompt.trim();
  const length = trimmed.length;
  const wordCount = length === 0 ? 0 : trimmed.split(/\s+/).length;

  const hasCodeFence = /```/.test(text) || /\b(function|def |class )\b/.test(text);
  const questionCount = (text.match(/\?/g) ?? []).length;
  const stepCount = (text.match(/(?:^|\n)\s*\d+[.)]/g) ?? []).length;
  const hasMath = MATH_PATTERNS.some((r) => r.test(text));
  const requestsStructuredOutput = STRUCTURED_PATTERNS.some((r) => r.test(text));
  const isTrivialChat = TRIVIAL_CHAT.some((r) => r.test(trimmed));

  const taskHits = {} as Record<Task, number>;
  for (const task of TASKS) {
    taskHits[task] = TASK_KEYWORDS[task].filter((r) => r.test(text)).length;
  }

  return {
    length,
    wordCount,
    hasCodeFence,
    questionCount,
    stepCount,
    hasMath,
    requestsStructuredOutput,
    isTrivialChat,
    taskHits,
  };
}
