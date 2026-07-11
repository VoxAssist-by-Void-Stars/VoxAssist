// Voyage embeddings client (plain REST — no SDK needed).
// Docs: https://docs.voyageai.com/reference/embeddings-api
import { config } from "../lib/config";

const VOYAGE_URL = "https://api.voyageai.com/v1/embeddings";
/** Voyage caps batch size; stay comfortably under it. */
const BATCH_SIZE = 100;

type VoyageResponse = {
  data: Array<{ embedding: number[]; index: number }>;
  model: string;
  usage: { total_tokens: number };
};

async function embedBatch(
  texts: string[],
  inputType: "document" | "query",
): Promise<number[][]> {
  const res = await fetch(VOYAGE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.voyageApiKey}`,
    },
    body: JSON.stringify({
      input: texts,
      model: config.voyageModel,
      input_type: inputType,
      output_dimension: config.embeddingDim,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Voyage embeddings failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const json = (await res.json()) as VoyageResponse;
  // Voyage returns items with an index; sort to be safe.
  const vectors = [...json.data]
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
  for (const v of vectors) {
    if (v.length !== config.embeddingDim) {
      throw new Error(
        `Embedding dim mismatch: got ${v.length}, expected ${config.embeddingDim} ` +
          `(check VOYAGE_MODEL/EMBEDDING_DIM vs the Atlas index)`,
      );
    }
  }
  return vectors;
}

/** Embed many texts (batched). Order of results matches input order. */
export async function embedDocuments(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    out.push(...(await embedBatch(texts.slice(i, i + BATCH_SIZE), "document")));
  }
  return out;
}

/** Embed a single query string. */
export async function embedQuery(text: string): Promise<number[]> {
  const [v] = await embedBatch([text], "query");
  return v;
}
