// M4 — Seed ingest: embed + upsert every demo user in seed/ into Atlas.
// Uses the REAL store (Voyage + Atlas) regardless of USE_MOCK_AI.
// Run: npm run seed
import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readdirSync, statSync } from "node:fs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
loadEnv({ path: resolve(ROOT, ".env") });

import { VectorStore } from "../src/ai/store";
import { ingest } from "../src/ingestion/ingest";
import { config } from "../src/lib/config";
import { getClient, getDb } from "../src/lib/db";

async function main() {
  const seedRoot = resolve(ROOT, "seed");
  const users = readdirSync(seedRoot).filter((name) =>
    statSync(resolve(seedRoot, name)).isDirectory(),
  );
  if (users.length === 0) throw new Error(`No user dirs found in ${seedRoot}`);

  console.log(`\nVoxAssist seed → Atlas (db=${config.mongoDb})`);
  console.log(`Users: ${users.join(", ")}`);
  console.log("──────────────────────────────────────────");

  const store = new VectorStore();
  let totalDocs = 0;
  let totalChunks = 0;

  for (const owner of users) {
    // shared: true — demo decision: all seeded data is queryable in friend mode.
    const { documents, chunks } = await ingest({
      vaultDir: resolve(seedRoot, owner),
      owner,
      shared: true,
    });
    const res = await store.upsert(documents, chunks);
    totalDocs += res.documents;
    totalChunks += res.chunks;
    console.log(`OK  ${owner.padEnd(8)} documents=${res.documents} chunks=${res.chunks}`);
  }

  const db = await getDb();
  const chunkCount = await db.collection(config.collections.chunks).countDocuments();
  const withVectors = await db
    .collection(config.collections.chunks)
    .countDocuments({ embedding: { $type: "array" } });
  console.log("──────────────────────────────────────────");
  console.log(`Ingested this run: documents=${totalDocs} chunks=${totalChunks}`);
  console.log(`Atlas totals: chunks=${chunkCount}, with embeddings=${withVectors}`);
  if (chunkCount !== withVectors) {
    console.log("WARNING: some chunks have no embedding!");
  }

  await (await getClient()).close();
  process.exit(0);
}

main().catch(async (e) => {
  console.error("\nSeed failed:", (e as Error).message);
  try {
    await (await getClient()).close();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
