import type { JudgeResult } from "./types";

export interface OpenRouterMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

export interface OpenRouterBody {
  model: string;
  messages: OpenRouterMessage[];
}

// Pure — no network. Turns a routing decision + prompt into the JSON body for an
// OpenRouter (OpenAI-compatible) chat-completion request.
export function toOpenRouterBody(decision: JudgeResult, prompt: string): OpenRouterBody {
  return {
    model: decision.model.slug,
    messages: [{ role: "user", content: prompt }],
  };
}
