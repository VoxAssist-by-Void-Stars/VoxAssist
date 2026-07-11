import "dotenv/config";
import path from "path";
import { getStore } from "../src/ai";
import { ingest } from "../src/ingestion/ingest";

function usage(): never {
  console.error("Usage: npm run ingest -- --vault <dir> --as <owner>");
  process.exit(1);
}

function parseArgs(argv: string[]): { vault: string; owner: string } {
  let vault: string | undefined;
  let owner: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--vault") {
      vault = argv[++i];
    } else if (arg === "--as") {
      owner = argv[++i];
    } else if (arg === "--help" || arg === "-h") {
      usage();
    }
  }

  if (!vault || !owner) usage();
  return { vault, owner };
}

async function main(): Promise<void> {
  if (process.env.USE_MOCK_AI === undefined) {
    process.env.USE_MOCK_AI = "true";
  }

  const { vault, owner } = parseArgs(process.argv.slice(2));
  const vaultDir = path.resolve(vault);

  console.log(`Ingesting vault: ${vaultDir}`);
  console.log(`Owner fallback: ${owner}`);

  const { documents, chunks } = await ingest({ vaultDir, owner });

  console.log("\n=== Ingestion summary ===");
  console.log(`Documents: ${documents.length}`);
  console.log(`Chunks:    ${chunks.length}`);

  for (const doc of documents) {
    const docChunks = chunks.filter((c) => c.documentPath === doc.path);
    console.log(`\n📄 ${doc.path} (owner=${doc.owner}, shared=${doc.shared}, chunks=${docChunks.length})`);
    for (const chunk of docChunks) {
      console.log(
        `  - [${chunk.id}] headingPath="${chunk.headingPath}" tags=[${chunk.tags.join(", ")}] links=[${chunk.links.join(", ")}]`,
      );
      const preview = chunk.content.replace(/\s+/g, " ").slice(0, 100);
      console.log(`    ${preview}${chunk.content.length > 100 ? "…" : ""}`);
    }
  }

  const store = getStore();
  const result = await store.upsert(documents, chunks);
  console.log(
    `\nUpserted via IVectorStore: documents=${result.documents} chunks=${result.chunks}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
