// src/contract/types.ts
// SHARED CONTRACT. Lock before coding.
// Flow:  ingestion (you) -> Chunk[]  ->  IVectorStore.upsert (teammate: embeds via Voyage + writes Atlas)
//        query (you/API) -> IRetriever.retrieve -> IGenerator.ask | .plan (teammate)

/** One markdown file. */
export interface DocumentMeta {
  path: string;                          // vault-relative path (unique)
  owner: string;                         // user id (from auth / --as)
  shared: boolean;                       // may OTHER users query this file?
  fileHash: string;                      // sha256 of whole file (file-level change gate)
  frontmatter: Record<string, unknown>;  // parsed YAML
  updatedAt: string;                     // ISO
}

/** One retrievable chunk of a note. Ingestion produces these WITHOUT embeddings. */
export interface Chunk {
  id: string;                 // stable, e.g. `${path}#${index}`
  documentPath: string;       // fk -> DocumentMeta.path
  owner: string;
  shared: boolean;
  headingPath: string;        // e.g. "Projects > RAGnarok > Stack"
  content: string;
  contentHash: string;        // sha256(content) — powers incremental sync
  tags: string[];             // frontmatter tags + inline #tags
  links: string[];            // resolved [[wikilinks]]
  embedding?: number[];       // added by teammate's embedder; unset at ingestion
}

/** Query scope. friend mode MUST be enforced with shared === true in retrieval. */
export type Scope =
  | { kind: "self"; owner: string }
  | { kind: "friend"; owner: string };   // target user's id

export interface Citation {
  documentPath: string;
  headingPath: string;
  owner: string;
}

export interface RetrievalResult {
  chunks: Array<Pick<Chunk, "content" | "headingPath" | "documentPath" | "owner">>;
  citations: Citation[];
}

// ---- API request/response ----
export interface AskRequest { question: string; scope: Scope; }
export interface AskResponse { answer: string; citations: Citation[]; }
export interface PlanRequest { idea: string; scope: Scope; }
export interface PlanResponse { brief: string; citations: Citation[]; markdownPath?: string; }

// ---- AI module interfaces (TEAMMATE implements; YOU call) ----
export interface IVectorStore {
  /** Embed (Voyage) + upsert docs+chunks into Atlas. Index creation handled out-of-band. */
  upsert(docs: DocumentMeta[], chunks: Chunk[]): Promise<{ documents: number; chunks: number }>;
}
export interface IRetriever {
  /** $vectorSearch + $rankFusion, filtered by scope. friend => owner match AND shared === true. */
  retrieve(query: string, scope: Scope, topN?: number): Promise<RetrievalResult>;
}
export interface IGenerator {
  ask(question: string, context: RetrievalResult): Promise<AskResponse>;   // Claude Haiku, grounded + cite
  plan(idea: string, context: RetrievalResult): Promise<PlanResponse>;     // Claude Opus
}
