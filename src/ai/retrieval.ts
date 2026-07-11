// Real IRetriever: hybrid retrieval over Atlas.
// Cluster is MongoDB 8.0.x — $rankFusion needs 8.1+, so we run the vector and
// lexical arms as separate pipelines and fuse app-side with Reciprocal Rank
// Fusion (RRF). Friend scope is enforced here: owner match AND shared === true.
import type { Document } from "mongodb";
import type { Chunk, IRetriever, RetrievalResult, Scope } from "../contract/types";
import { config } from "../lib/config";
import { getDb } from "../lib/db";
import { embedQuery } from "./embeddings";

const VECTOR_INDEX = "chunks_vector";
const TEXT_INDEX = "chunks_text";
/** Standard RRF constant. */
const RRF_K = 60;
/** Candidates fetched per arm before fusion. */
const ARM_LIMIT = 20;

type StoredChunk = Pick<
  Chunk,
  "id" | "content" | "headingPath" | "documentPath" | "owner" | "shared"
> & { _id: string };

function scopeMongoFilter(scope: Scope): Document {
  // friend mode MUST be limited to shared === true (contract guardrail).
  return scope.kind === "friend"
    ? { owner: scope.owner, shared: true }
    : { owner: scope.owner };
}

async function vectorArm(query: string, scope: Scope): Promise<StoredChunk[]> {
  const db = await getDb();
  const queryVector = await embedQuery(query);
  const pipeline: Document[] = [
    {
      $vectorSearch: {
        index: VECTOR_INDEX,
        path: "embedding",
        queryVector,
        numCandidates: 200,
        limit: ARM_LIMIT,
        filter: scopeMongoFilter(scope),
      },
    },
    { $project: { content: 1, headingPath: 1, documentPath: 1, owner: 1, shared: 1, id: 1 } },
  ];
  return (await db
    .collection(config.collections.chunks)
    .aggregate(pipeline)
    .toArray()) as StoredChunk[];
}

async function lexicalArm(query: string, scope: Scope): Promise<StoredChunk[]> {
  const db = await getDb();
  const filter: Document[] = [{ equals: { path: "owner", value: scope.owner } }];
  if (scope.kind === "friend") {
    filter.push({ equals: { path: "shared", value: true } });
  }
  const pipeline: Document[] = [
    {
      $search: {
        index: TEXT_INDEX,
        compound: {
          must: [{ text: { query, path: "content" } }],
          filter,
        },
      },
    },
    { $limit: ARM_LIMIT },
    { $project: { content: 1, headingPath: 1, documentPath: 1, owner: 1, shared: 1, id: 1 } },
  ];
  return (await db
    .collection(config.collections.chunks)
    .aggregate(pipeline)
    .toArray()) as StoredChunk[];
}

/** Fuse ranked lists by Reciprocal Rank Fusion; higher fused score wins. */
function rrfFuse(lists: StoredChunk[][], topN: number): StoredChunk[] {
  const scores = new Map<string, { chunk: StoredChunk; score: number }>();
  for (const list of lists) {
    list.forEach((chunk, rank) => {
      const entry = scores.get(chunk._id) ?? { chunk, score: 0 };
      entry.score += 1 / (RRF_K + rank + 1);
      scores.set(chunk._id, entry);
    });
  }
  return [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .map((e) => e.chunk);
}

export class Retriever implements IRetriever {
  async retrieve(query: string, scope: Scope, topN = 8): Promise<RetrievalResult> {
    // Run both arms in parallel; degrade gracefully if one fails (e.g. index
    // rebuilding) as long as the other returns.
    const settled = await Promise.allSettled([
      vectorArm(query, scope),
      lexicalArm(query, scope),
    ]);
    const lists = settled
      .filter((s): s is PromiseFulfilledResult<StoredChunk[]> => s.status === "fulfilled")
      .map((s) => s.value);
    if (lists.length === 0) {
      const reason = (settled[0] as PromiseRejectedResult).reason;
      throw new Error(`Retrieval failed on both arms: ${(reason as Error).message}`);
    }

    let fused = rrfFuse(lists, topN);
    // Defense in depth: re-assert the friend guardrail on the final set.
    if (scope.kind === "friend") {
      fused = fused.filter((c) => c.owner === scope.owner && c.shared === true);
    }

    const chunks = fused.map((c) => ({
      content: c.content,
      headingPath: c.headingPath,
      documentPath: c.documentPath,
      owner: c.owner,
    }));
    const seen = new Set<string>();
    const citations = chunks
      .filter((c) => {
        const key = `${c.documentPath}::${c.headingPath}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((c) => ({
        documentPath: c.documentPath,
        headingPath: c.headingPath,
        owner: c.owner,
      }));
    return { chunks, citations };
  }
}

export function createRetriever(): IRetriever {
  return new Retriever();
}
