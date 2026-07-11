// Central config. Getters validate lazily so `--help`/scaffold tasks don't
// require a full .env. Next.js loads .env automatically; standalone scripts
// load it themselves (see scripts/).

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name} (see .env.example)`);
  return v;
}

export const config = {
  get anthropicApiKey() {
    return required("ANTHROPIC_API_KEY");
  },
  get mongoUri() {
    return required("MONGODB_URI");
  },
  mongoDb: process.env.MONGODB_DB || "voxassist",
  get voyageApiKey() {
    return required("VOYAGE_API_KEY");
  },
  voyageModel: process.env.VOYAGE_MODEL || "voyage-3.5",
  embeddingDim: Number(process.env.EMBEDDING_DIM || 1024),
  // All synthesis is Claude: a small/fast model for grounded `ask`, Opus for `plan`.
  askModel: process.env.CLAUDE_ASK_MODEL || "claude-haiku-4-5-20251001",
  planModel: process.env.CLAUDE_PLAN_MODEL || "claude-opus-4-8",
  collections: {
    chunks: "chunks",
    users: "users",
  },
} as const;
