import type { ModelCatalog } from "./types";

// Curated, versioned. Update the entries + bump `version` when new models land.
// Slugs follow OpenRouter's `provider/model` convention.
export const DEFAULT_CATALOG: ModelCatalog = {
  version: "2026-07-08.1",
  models: [
    {
      slug: "anthropic/claude-haiku-4.5",
      strengths: ["chat", "summary", "translation", "json_extraction"],
      costTier: "low",
      contextWindow: 200000,
      supportsStructuredOutput: true,
    },
    {
      slug: "openai/gpt-4o-mini",
      strengths: ["chat", "summary", "translation", "json_extraction"],
      costTier: "low",
      contextWindow: 128000,
      supportsStructuredOutput: true,
    },
    {
      slug: "google/gemini-2.0-flash",
      strengths: ["chat", "summary", "translation", "json_extraction"],
      costTier: "low",
      contextWindow: 1000000,
      supportsStructuredOutput: true,
    },
    {
      slug: "deepseek/deepseek-chat",
      strengths: ["code", "chat", "summary"],
      costTier: "low",
      contextWindow: 64000,
      supportsStructuredOutput: false,
    },
    {
      slug: "openai/gpt-4o",
      strengths: ["chat", "summary", "code", "translation", "json_extraction"],
      costTier: "medium",
      contextWindow: 128000,
      supportsStructuredOutput: true,
    },
    {
      slug: "anthropic/claude-sonnet-4.5",
      strengths: ["code", "summary", "chat", "research"],
      costTier: "medium",
      contextWindow: 200000,
      supportsStructuredOutput: true,
    },
    {
      slug: "anthropic/claude-opus-4.1",
      strengths: ["code", "research", "summary"],
      costTier: "high",
      contextWindow: 200000,
      supportsStructuredOutput: true,
    },
    {
      slug: "openai/o3",
      strengths: ["research", "code"],
      costTier: "high",
      contextWindow: 200000,
      supportsStructuredOutput: true,
    },
    {
      slug: "google/gemini-2.5-pro",
      strengths: ["research", "code", "summary"],
      costTier: "high",
      contextWindow: 1000000,
      supportsStructuredOutput: true,
    },
  ],
};
