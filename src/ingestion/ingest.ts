import type { Chunk, DocumentMeta } from "../contract/types";
import { chunkMarkdown, extractTags } from "./chunker";
import { parseFrontmatter } from "./frontmatter";
import { sha256 } from "./hash";
import { walkVault } from "./vaultWalker";

export interface IngestOptions {
  vaultDir: string;
  /** Fallback owner when frontmatter omits `owner`. */
  owner: string;
  /** Fallback shared flag when frontmatter omits `shared`. Defaults to false. */
  shared?: boolean;
}

export interface IngestResult {
  documents: DocumentMeta[];
  chunks: Chunk[];
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    if (lower === "true") return true;
    if (lower === "false") return false;
  }
  return undefined;
}

function frontmatterTags(data: Record<string, unknown>): string[] {
  const raw = data.tags;
  if (Array.isArray(raw)) {
    return raw.filter((t): t is string => typeof t === "string");
  }
  if (typeof raw === "string") {
    return raw
      .split(/[,\s]+/)
      .map((t) => t.replace(/^#/, "").trim())
      .filter(Boolean);
  }
  return [];
}

function mergeTags(...lists: string[][]): string[] {
  return [...new Set(lists.flat())];
}

/**
 * Walk → parse → chunk → hash into DocumentMeta[] + Chunk[].
 * Does not embed; embeddings are added later by the vector store.
 */
export async function ingest(options: IngestOptions): Promise<IngestResult> {
  const sharedFallback = options.shared ?? false;
  const files = await walkVault(options.vaultDir);

  const documents: DocumentMeta[] = [];
  const chunks: Chunk[] = [];

  for (const file of files) {
    const { data, content } = parseFrontmatter(file.raw);
    const owner = asString(data.owner) ?? options.owner;
    const shared = asBoolean(data.shared) ?? sharedFallback;
    const fmTags = frontmatterTags(data);

    const updatedAt =
      asString(data.updatedAt) ??
      asString(data.updated) ??
      new Date().toISOString();

    documents.push({
      path: file.path,
      owner,
      shared,
      fileHash: file.fileHash,
      frontmatter: data,
      updatedAt,
    });

    const rawChunks = chunkMarkdown(content);
    rawChunks.forEach((raw, index) => {
      const tags = mergeTags(fmTags, raw.tags, extractTags(raw.content));
      chunks.push({
        id: `${file.path}#${index}`,
        documentPath: file.path,
        owner,
        shared,
        headingPath: raw.headingPath,
        content: raw.content,
        contentHash: sha256(raw.content),
        tags,
        links: raw.links,
      });
    });
  }

  return { documents, chunks };
}
