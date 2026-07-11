import "@/lib/config";
import path from "path";
import { getStore } from "@/ai";
import { ingest } from "@/ingestion/ingest";
import { config } from "@/lib/config";
import { ingestRequestSchema } from "@/lib/schemas";

export const runtime = "nodejs";

function jsonError(message: string, status: number, details?: unknown) {
  return Response.json(
    { error: message, ...(details !== undefined ? { details } : {}) },
    { status },
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = ingestRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid ingest request", 400, parsed.error.flatten());
  }

  const { vault, owner, shared } = parsed.data;
  const vaultDir = path.resolve(vault);

  try {
    const { documents, chunks } = await ingest({
      vaultDir,
      owner: owner ?? config.defaultIngestOwner,
      shared,
    });

    const store = await getStore();
    const result = await store.upsert(documents, chunks);

    return Response.json({
      vault: vaultDir.replace(/\\/g, "/"),
      documents: result.documents,
      chunks: result.chunks,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ingest failed";
    return jsonError(message, 500);
  }
}
