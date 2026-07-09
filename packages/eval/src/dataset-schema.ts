import type { Task, Complexity, CostTier } from "arbitro";

const TASKS: Task[] = ["chat", "summary", "code", "research", "json_extraction", "translation"];
const COMPLEXITIES: Complexity[] = ["low", "medium", "high"];
const TIERS: CostTier[] = ["low", "medium", "high"];
const LANGS = ["pt", "en"];

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function validateDataset(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!isObject(data)) return { valid: false, errors: ["dataset is not an object"] };
  if (typeof data.version !== "string") errors.push("version must be a string");
  if (!Array.isArray(data.cases)) return { valid: false, errors: [...errors, "cases must be an array"] };

  const seenIds = new Set<string>();
  data.cases.forEach((c, i) => {
    const where = `case[${i}]`;
    if (!isObject(c)) {
      errors.push(`${where} is not an object`);
      return;
    }
    if (typeof c.id !== "string" || c.id.length === 0) errors.push(`${where}.id must be a non-empty string`);
    else if (seenIds.has(c.id)) errors.push(`${where}.id duplicate: ${c.id}`);
    else seenIds.add(c.id);

    if (typeof c.prompt !== "string" || c.prompt.length === 0) errors.push(`${where}.prompt must be a non-empty string`);
    if (typeof c.lang !== "string" || !LANGS.includes(c.lang)) errors.push(`${where}.lang invalid`);
    if (!Array.isArray(c.tags)) errors.push(`${where}.tags must be an array`);

    const e = c.expected;
    if (!isObject(e)) {
      errors.push(`${where}.expected is not an object`);
      return;
    }
    if (!TASKS.includes(e.task as Task)) errors.push(`${where}.expected.task invalid: ${String(e.task)}`);
    if (!COMPLEXITIES.includes(e.complexity as Complexity)) errors.push(`${where}.expected.complexity invalid: ${String(e.complexity)}`);
    if (typeof e.needs_structured_output !== "boolean") errors.push(`${where}.expected.needs_structured_output must be boolean`);
    if (!TIERS.includes(e.tier as CostTier)) errors.push(`${where}.expected.tier invalid: ${String(e.tier)}`);
  });

  return { valid: errors.length === 0, errors };
}
