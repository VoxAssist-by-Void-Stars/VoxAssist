// CLI verification for M5/M6/M7 — real retrieval + real Claude synthesis.
// Usage:
//   npx tsx scripts/query.ts ask  "question" --owner alex
//   npx tsx scripts/query.ts ask  "question" --owner priya --friend
//   npx tsx scripts/query.ts plan "idea"     --owner alex [--out brief.md]
//   npx tsx scripts/query.ts retrieve "query" --owner alex   (retrieval only, no LLM)
import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
loadEnv({ path: resolve(ROOT, ".env") });

import { Generator } from "../src/ai/generation";
import { Retriever } from "../src/ai/retrieval";
import type { Scope } from "../src/contract/types";
import { getClient } from "../src/lib/db";

function usage(): never {
  console.error(
    'Usage: npx tsx scripts/query.ts <ask|plan|retrieve> "text" --owner <id> [--friend] [--out file.md]',
  );
  process.exit(1);
}

async function main() {
  const argv = process.argv.slice(2);
  const mode = argv[0];
  const text = argv[1];
  if (!mode || !text || !["ask", "plan", "retrieve"].includes(mode)) usage();

  let owner = "";
  let friend = false;
  let out: string | undefined;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--owner") owner = argv[++i];
    else if (argv[i] === "--friend") friend = true;
    else if (argv[i] === "--out") out = argv[++i];
  }
  if (!owner) usage();

  const scope: Scope = friend
    ? { kind: "friend", owner }
    : { kind: "self", owner };

  const retriever = new Retriever();
  const retrieval = await retriever.retrieve(text, scope);
  console.log(`\n[retrieval] scope=${scope.kind}:${owner} chunks=${retrieval.chunks.length}`);
  retrieval.chunks.forEach((c, i) =>
    console.log(`  [${i + 1}] ${c.documentPath} › ${c.headingPath}`),
  );

  if (mode === "retrieve") {
    await (await getClient()).close();
    return;
  }

  const generator = new Generator();
  if (mode === "ask") {
    const { answer, citations } = await generator.ask(text, retrieval);
    console.log(`\n=== ANSWER ===\n${answer}\n`);
    console.log(`Citations: ${citations.map((c) => c.documentPath).join(", ")}`);
  } else {
    const { brief, citations } = await generator.plan(text, retrieval);
    console.log(`\n=== BRIEF ===\n${brief}\n`);
    console.log(`Citations: ${citations.map((c) => c.documentPath).join(", ")}`);
    if (out) {
      const dest = resolve(ROOT, "output", out);
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, brief);
      console.log(`Brief written to ${dest}`);
    }
  }

  await (await getClient()).close();
}

main()
  .then(() => process.exit(0))
  .catch(async (e) => {
    console.error("\nQuery failed:", (e as Error).message);
    process.exit(1);
  });
