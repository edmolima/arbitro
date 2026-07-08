import { createInterface } from "node:readline";
import { createArbitro } from "arbitro";
import { runBatch } from "./batch";

function printBatch(costPreference: number): void {
  const rows = runBatch(costPreference);
  console.log(`\ncostPreference=${costPreference}\n`);
  for (const r of rows) {
    const prompt = r.prompt.length > 48 ? r.prompt.slice(0, 45) + "..." : r.prompt;
    console.log(
      `${prompt.padEnd(50)} ${r.task.padEnd(16)} ${r.complexity.padEnd(7)} ` +
        `${r.confidence.toFixed(2)}  ${r.model}`,
    );
  }
  console.log("");
}

function startRepl(): void {
  let costPreference = 0.5;
  console.log(
    "Arbitro playground. Type a prompt and press Enter.\n" +
      "Commands: `:cost 0.8` to set cost preference, `:q` to quit.\n",
  );
  const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: "› " });
  rl.prompt();
  rl.on("line", (line) => {
    const input = line.trim();
    if (input === ":q") return rl.close();
    const costMatch = input.match(/^:cost\s+([0-9.]+)$/);
    if (costMatch) {
      costPreference = Number(costMatch[1]);
      console.log(`costPreference set to ${costPreference}\n`);
      return rl.prompt();
    }
    if (input.length === 0) return rl.prompt();

    const d = createArbitro({ costPreference }).judge(input);
    console.log(
      `\n  model:        ${d.model}\n` +
        `  alternatives: ${d.alternatives.join(", ") || "(none)"}\n` +
        `  task:         ${d.task}    complexity: ${d.complexity}    confidence: ${d.confidence.toFixed(2)}\n` +
        `  reason:       ${d.reason}\n`,
    );
    rl.prompt();
  });
  rl.on("close", () => console.log("bye"));
}

if (process.argv.includes("--batch")) {
  printBatch(0.5);
} else {
  startRepl();
}
