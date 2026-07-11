// Real IVectorStore: Voyage-embed chunks, bulk-upsert docs + chunks into Atlas.
// Index creation is out-of-band (scripts/atlas-setup.ts).
import type { AnyBulkWriteOperation, Document } from "mongodb";
import type { Chunk, DocumentMeta, IVectorStore } from "../contract/types";
import { config } from "../lib/config";
import { getDb } from "../lib/db";
import { embedDocuments } from "./embeddings";

/**
 * Chunk ids (`${path}#${index}`) use vault-relative paths, so two owners can
 * produce the same id (e.g. `profile.md#0`). Qualify Atlas _ids by owner.
 */
function chunkMongoId(c: Chunk): string {
  return `${c.owner}:${c.id}`;
}
function docMongoId(d: DocumentMeta): string {
  return `${d.owner}:${d.path}`;
}

export class VectorStore implements IVectorStore {
  async upsert(
    docs: DocumentMeta[],
    chunks: Chunk[],
  ): Promise<{ documents: number; chunks: number }> {
    const db = await getDb();

    // Embed any chunk that doesn't already carry a vector.
    const missing = chunks.filter((c) => !c.embedding);
    if (missing.length > 0) {
      const vectors = await embedDocuments(missing.map((c) => c.content));
      missing.forEach((c, i) => {
        c.embedding = vectors[i];
      });
    }

    if (docs.length > 0) {
      const docOps: AnyBulkWriteOperation<Document>[] = docs.map((d) => ({
        replaceOne: {
          filter: { _id: docMongoId(d) as never },
          replacement: { _id: docMongoId(d), ...d } as never,
          upsert: true,
        },
      }));
      await db.collection(config.collections.documents).bulkWrite(docOps);
    }

    if (chunks.length > 0) {
      const chunkOps: AnyBulkWriteOperation<Document>[] = chunks.map((c) => ({
        replaceOne: {
          filter: { _id: chunkMongoId(c) as never },
          replacement: { _id: chunkMongoId(c), ...c } as never,
          upsert: true,
        },
      }));
      await db.collection(config.collections.chunks).bulkWrite(chunkOps);
    }

    return { documents: docs.length, chunks: chunks.length };
  }
}

export function createStore(): IVectorStore {
  return new VectorStore();
}
