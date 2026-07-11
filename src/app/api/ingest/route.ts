import "@/lib/config";
import path from "path";
import { getStore } from "@/ai";
import { requireUserId } from "@/lib/auth";
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

/**
 * Optional HTTP ingest — disabled unless ALLOW_HTTP_INGEST=true.
 * Prefer the CLI (`npm run ingest`) for seeding Atlas in prod.
 */
export async function POST(request: Request) {
  if (!config.allowHttpIngest) {
    return jsonError(
      "HTTP ingest is disabled. Use `npm run ingest` locally against MONGODB_URI, or set ALLOW_HTTP_INGEST=true.",
      403,
    );
  }

  const authed = await requireUserId();
  if ("response" in authed) return authed.response;

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
