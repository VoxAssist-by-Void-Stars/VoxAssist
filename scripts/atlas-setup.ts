// M1 — Atlas setup. Creates the `chunks` collection and the two indexes that
// power hybrid retrieval: a vectorSearch index on `embedding` and an Atlas
// Search index on `content` (+ owner/shared filters). Idempotent — safe to
// re-run. Run: npm run atlas:setup
import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "..", ".env") });

import { getClient, getDb } from "../src/lib/db";
import { config } from "../src/lib/config";

const VECTOR_INDEX = "chunks_vector";
const TEXT_INDEX = "chunks_text";

async function ensureCollection(dbName: string, name: string) {
  const db = await getDb();
  const existing = await db.listCollections({ name }).toArray();
  if (existing.length === 0) {
    await db.createCollection(name);
    console.log(`OK  created collection ${dbName}.${name}`);
  } else {
    console.log(`OK  collection ${dbName}.${name} already exists`);
  }
}

async function ensureSearchIndex(
  collName: string,
  name: string,
  description: { name: string; type: string; definition: unknown },
) {
  const db = await getDb();
  const coll = db.collection(collName);
  const existing = await coll.listSearchIndexes().toArray();
  if (existing.some((idx) => idx.name === name)) {
    console.log(`OK  search index ${name} already exists (leaving as-is)`);
    return;
  }
  await coll.createSearchIndex(description as never);
  console.log(`OK  requested search index ${name} (build is async — see Atlas)`);
}

async function main() {
  const dim = config.embeddingDim;
  console.log(`\nVoxAssist Atlas setup  (db=${config.mongoDb}, dim=${dim})`);
  console.log("──────────────────────────────────────────");

  await ensureCollection(config.mongoDb, config.collections.chunks);

  // Vector index: ANN over `embedding`, pre-filterable by owner + shared.
  await ensureSearchIndex(config.collections.chunks, VECTOR_INDEX, {
    name: VECTOR_INDEX,
    type: "vectorSearch",
    definition: {
      fields: [
        { type: "vector", path: "embedding", numDimensions: dim, similarity: "cosine" },
        { type: "filter", path: "owner" },
        { type: "filter", path: "shared" },
      ],
    },
  });

  // Full-text index for the lexical arm of $rankFusion, with owner/shared as tokens.
  await ensureSearchIndex(config.collections.chunks, TEXT_INDEX, {
    name: TEXT_INDEX,
    type: "search",
    definition: {
      mappings: {
        dynamic: false,
        fields: {
          content: { type: "string" },
          owner: { type: "token" },
          shared: { type: "boolean" },
          tags: { type: "token" },
        },
      },
    },
  });

  console.log("\nCurrent search indexes on `chunks`:");
  const coll = (await getDb()).collection(config.collections.chunks);
  for (const idx of (await coll.listSearchIndexes().toArray()) as Array<{
    name: string;
    type?: string;
    status?: string;
  }>) {
    console.log(`  - ${idx.name}  [${idx.type ?? "search"}]  status=${idx.status ?? "PENDING"}`);
  }
  console.log(
    "\nNote: Atlas builds search indexes asynchronously; status goes PENDING → READY " +
      "in ~1 min. Re-run this script or check the Atlas UI to confirm READY before M5.",
  );

  await (await getClient()).close();
  process.exit(0);
}

main().catch(async (e) => {
  console.error("\nAtlas setup failed:", (e as Error).message);
  try {
    await (await getClient()).close();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
