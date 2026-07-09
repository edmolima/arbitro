import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { validateDataset } from "../src/dataset-schema";
import type { EvalCase, EvalDataset } from "../src/types";

// Offline dev tool. Uses OpenRouter to synthesize labeled cases, validates them, and
// writes dataset/cases.json. Requires OPENROUTER_API_KEY. NOT run in CI.

const MODEL = process.env.ARBITRO_GEN_MODEL ?? "anthropic/claude-sonnet-4.5";
const TARGETS = [
  { task: "chat", n: 8 },
  { task: "summary", n: 8 },
  { task: "code", n: 8 },
  { task: "research", n: 8 },
  { task: "json_extraction", n: 8 },
  { task: "translation", n: 8 },
] as const;

const SYSTEM = `You generate labeled evaluation cases for a prompt→model router.
Return ONLY a JSON array (no markdown) of objects with this exact shape:
{"prompt": string, "lang": "pt"|"en", "expected": {"task": <TASK>, "complexity":"low"|"medium"|"high", "needs_structured_output": boolean, "tier":"low"|"medium"|"high"}}
Rules: prompts must be realistic and varied (mix pt and en). "task" MUST equal the target task.
"needs_structured_output" is true only when the prompt explicitly asks for JSON/table/keys.
"tier" is the appropriate cost band: trivial→low, intermediate→medium, hard-reasoning→high.`;

async function generateFor(task: string, n: number): Promise<EvalCase[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is required to generate the dataset");

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM.replace("<TASK>", `"${task}"`) },
        { role: "user", content: `Generate ${n} cases for task "${task}".` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { choices: { message: { content: string } }[] };
  const text = json.choices[0]!.message.content.replace(/^```json\s*|\s*```$/g, "").trim();
  const rows = JSON.parse(text) as Array<Omit<EvalCase, "id" | "tags">>;
  return rows.map((r, i) => ({
    id: `${task}-${String(i + 1).padStart(3, "0")}`,
    prompt: r.prompt,
    lang: r.lang,
    expected: r.expected,
    tags: [task, r.lang],
  }));
}

async function main(): Promise<void> {
  const all: EvalCase[] = [];
  for (const { task, n } of TARGETS) {
    process.stderr.write(`generating ${n} cases for ${task}...\n`);
    all.push(...(await generateFor(task, n)));
  }
  const dataset: EvalDataset = { version: `${new Date().toISOString().slice(0, 10)}.gen`, cases: all };

  const validation = validateDataset(dataset);
  if (!validation.valid) {
    console.error("Generated dataset failed validation:\n" + validation.errors.join("\n"));
    process.exit(1);
  }
  const out = fileURLToPath(new URL("../dataset/cases.json", import.meta.url));
  writeFileSync(out, JSON.stringify(dataset, null, 2) + "\n");
  process.stderr.write(`wrote ${all.length} cases to ${out}\n`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
