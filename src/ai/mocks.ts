import type {
  AskResponse,
  Chunk,
  DocumentMeta,
  IGenerator,
  IRetriever,
  IVectorStore,
  PlanResponse,
  RetrievalResult,
  Scope,
} from "../contract/types";

const CANNED_CHUNKS: Array<
  Pick<Chunk, "content" | "headingPath" | "documentPath">
> = [
  {
    content:
      "Sample stack: Next.js App Router, TypeScript, MongoDB Atlas, and Voyage embeddings.",
    headingPath: "Projects > RAGnarok > Stack",
    documentPath: "projects/ragnarok.md",
  },
  {
    content: "Auth is handled by Clerk; the Clerk userId becomes document owner.",
    headingPath: "Projects > RAGnarok > Auth",
    documentPath: "projects/ragnarok.md",
  },
  {
    content: "Deploy target is DigitalOcean App Platform with optional Dockerfile.",
    headingPath: "Projects > RAGnarok > Deploy",
    documentPath: "projects/ragnarok.md",
  },
];

function cannedRetrieval(owner: string): RetrievalResult {
  const chunks = CANNED_CHUNKS.map((c) => ({ ...c, owner }));
  return {
    chunks,
    citations: chunks.map((c) => ({
      documentPath: c.documentPath,
      headingPath: c.headingPath,
      owner: c.owner,
    })),
  };
}

export class MockVectorStore implements IVectorStore {
  async upsert(
    docs: DocumentMeta[],
    chunks: Chunk[],
  ): Promise<{ documents: number; chunks: number }> {
    console.log(
      `[MockVectorStore.upsert] documents=${docs.length} chunks=${chunks.length}`,
    );
    return { documents: docs.length, chunks: chunks.length };
  }
}

export class MockRetriever implements IRetriever {
  async retrieve(
    _query: string,
    scope: Scope,
    _topN?: number,
  ): Promise<RetrievalResult> {
    // Honor scope only by stamping owner; ignore query / friend shared filter in mocks.
    return cannedRetrieval(scope.owner);
  }
}

export class MockGenerator implements IGenerator {
  async ask(
    question: string,
    context: RetrievalResult,
  ): Promise<AskResponse> {
    const quotes = context.chunks
      .map(
        (c, i) =>
          `[${i + 1}] (${c.documentPath} · ${c.headingPath}) "${c.content}"`,
      )
      .join("\n");

    return {
      answer:
        `Grounded answer for: ${question}\n\n` +
        `From your notes:\n${quotes}\n\n` +
        `Summary: the project uses Next.js + Atlas/Voyage, Clerk for auth, and DigitalOcean for deploy.`,
      citations: context.citations,
    };
  }

  async plan(idea: string, context: RetrievalResult): Promise<PlanResponse> {
    const sources = context.citations
      .map((c) => `- ${c.documentPath} (${c.headingPath})`)
      .join("\n");

    return {
      brief:
        `# Project brief\n\n` +
        `## Idea\n${idea}\n\n` +
        `## Proposed approach\n` +
        `1. Ingest vault notes into chunked DocumentMeta/Chunk records.\n` +
        `2. Embed + upsert via Voyage + MongoDB Atlas Vector Search.\n` +
        `3. Expose /api/ask (Gemini) and /api/plan (Opus via Gradient) with citations.\n` +
        `4. Protect routes with Clerk; friend scope only returns shared notes.\n\n` +
        `## Sources\n${sources || "- (none)"}\n`,
      citations: context.citations,
    };
  }
}
