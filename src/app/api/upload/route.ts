import { getStore } from "@/ai";
import { requireUserId } from "@/lib/auth";
import { config } from "@/lib/config";
import { ingestFiles } from "@/ingestion/ingest";
import { sha256 } from "@/ingestion/hash";
import { countOwnerChunks, countOwnerDocuments } from "@/lib/owners";
import { checkLlmRateLimit } from "@/lib/rateLimit";
import { resolveClerkUserIdToOwner } from "@/lib/users";

export const runtime = "nodejs";

/** Keep uploads demo-sized; embedding cost scales with content. */
const MAX_BYTES = 1_000_000;
const ALLOWED_EXTENSIONS = [".md", ".txt", ".markdown"];

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "notes.md";
  const safe = base.replace(/[^a-zA-Z0-9._ -]/g, "").trim().replace(/\s+/g, "-");
  return safe || "notes.md";
}

/**
 * Upload one markdown/txt file into the caller's knowledge base.
 * Owner is ALWAYS the signed-in user — never taken from the client.
 * The file is chunked, Voyage-embedded, and upserted into Atlas.
 */
export async function POST(request: Request) {
  const authed = await requireUserId();
  if ("response" in authed) return authed.response;
  const owner = resolveClerkUserIdToOwner(authed.userId);

  // Uploads trigger embedding calls — reuse the per-user LLM rate limit.
  const limited = checkLlmRateLimit(authed.userId);
  if (limited) return jsonError(limited, 429);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("Expected multipart/form-data with a `file` field", 400);
  }

  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return jsonError("Missing `file` field", 400);
  }
  const filename = sanitizeFilename(
    (file instanceof File ? file.name : "") || "notes.md",
  );
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return jsonError(`Only ${ALLOWED_EXTENSIONS.join(", ")} files are supported`, 415);
  }
  if (file.size > MAX_BYTES) {
    return jsonError(`File too large (max ${Math.round(MAX_BYTES / 1000)} KB)`, 413);
  }

  const raw = await file.text();
  if (!raw.trim()) return jsonError("File is empty", 400);

  // "Willing to share" flag — checked by friend-scope retrieval.
  const shared = form.get("shared") === "true";

  try {
    const { documents, chunks } = await ingestFiles(
      [{ path: `uploads/${filename}`, raw, fileHash: sha256(raw) }],
      // Force owner + shared: frontmatter in an uploaded file must not let a
      // user write into someone else's vault.
      { owner, shared },
    );
    for (const d of documents) {
      d.owner = owner;
      d.shared = shared;
    }
    for (const c of chunks) {
      c.owner = owner;
      c.shared = shared;
    }

    // Per-owner caps guard Atlas M0 disk from open-upload growth.
    const [existingChunks, existingDocs] = await Promise.all([
      countOwnerChunks(owner),
      countOwnerDocuments(owner),
    ]);
    if (existingChunks + chunks.length > config.uploadMaxChunksPerUser) {
      return jsonError(
        `Upload quota exceeded: max ${config.uploadMaxChunksPerUser} chunks per user`,
        413,
      );
    }
    if (existingDocs + documents.length > config.uploadMaxDocsPerUser) {
      return jsonError(
        `Upload quota exceeded: max ${config.uploadMaxDocsPerUser} documents per user`,
        413,
      );
    }

    const store = await getStore();
    const result = await store.upsert(documents, chunks);

    return Response.json({
      path: `uploads/${filename}`,
      owner,
      shared,
      documents: result.documents,
      chunks: result.chunks,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return jsonError(message, 500);
  }
}
