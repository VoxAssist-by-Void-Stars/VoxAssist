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

/** Minimal mock store so the ingest CLI can call upsert before Step 3 is fully wired. */
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
    const owner = scope.owner;
    const chunks = [
      {
        content: "Sample stack: Next.js, MongoDB Atlas, Voyage.",
        headingPath: "Projects > RAGnarok > Stack",
        documentPath: "projects/ragnarok.md",
        owner,
      },
      {
        content: "Auth is handled by Clerk.",
        headingPath: "Projects > RAGnarok > Auth",
        documentPath: "projects/ragnarok.md",
        owner,
      },
      {
        content: "Deploy target is DigitalOcean App Platform.",
        headingPath: "Projects > RAGnarok > Deploy",
        documentPath: "projects/ragnarok.md",
        owner,
      },
    ];
    return {
      chunks,
      citations: chunks.map((c) => ({
        documentPath: c.documentPath,
        headingPath: c.headingPath,
        owner: c.owner,
      })),
    };
  }
}

export class MockGenerator implements IGenerator {
  async ask(
    question: string,
    context: RetrievalResult,
  ): Promise<AskResponse> {
    const quoted = context.chunks.map((c) => c.content).join(" ");
    return {
      answer: `Based on your notes: ${quoted} (re: ${question})`,
      citations: context.citations,
    };
  }

  async plan(idea: string, context: RetrievalResult): Promise<PlanResponse> {
    return {
      brief: `# Plan\n\nIdea: ${idea}\n\nContext used from ${context.chunks.length} chunks.`,
      citations: context.citations,
    };
  }
}
