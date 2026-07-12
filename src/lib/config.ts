/**
 * Central env config with sane defaults for local/dev.
 * Import this from API routes so defaults (esp. USE_MOCK_AI) apply before the AI factory runs.
 * UI/app fields (lane/app) + retrieval/synthesis fields (DevBranch) merged.
 */

function env(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name} (see .env.example)`);
  return v;
}

function envInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

// Default to mocks unless explicitly disabled — matches .env.example.
if (process.env.USE_MOCK_AI === undefined) {
  process.env.USE_MOCK_AI = "true";
}
if (process.env.AI_FALLBACK_TO_MOCK === undefined) {
  process.env.AI_FALLBACK_TO_MOCK = "true";
}

export const config = {
  mongodbUri: env("MONGODB_URI"),
  voyageApiKey: env("VOYAGE_API_KEY"),
  anthropicBaseUrl: env("ANTHROPIC_BASE_URL"),
  anthropicApiKey: env("ANTHROPIC_API_KEY"),
  clerkPublishableKey: env("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"),
  clerkSecretKey: env("CLERK_SECRET_KEY"),
  /** True when USE_MOCK_AI === "true" (default if unset). */
  useMockAi: process.env.USE_MOCK_AI === "true",
  /** Fall back to mocks when real retriever/generator fail. */
  aiFallbackToMock: process.env.AI_FALLBACK_TO_MOCK !== "false",
  /** Clerk userId:owner pairs for demo identity. */
  clerkOwnerMap: env("CLERK_OWNER_MAP"),
  /** Max LLM requests per user per minute; 0 disables. */
  llmRateLimitPerMinute: envInt("LLM_RATE_LIMIT_PER_MINUTE", 30),
  /** Directory for /api/plan markdown briefs. */
  outputDir: env("OUTPUT_DIR", "./output"),
  /** Default owner for optional /api/ingest when body omits owner. */
  defaultIngestOwner: env("DEFAULT_INGEST_OWNER", "anonymous"),
  /** When false, /api/ingest is disabled (prod default via ALLOW_HTTP_INGEST). */
  allowHttpIngest: process.env.ALLOW_HTTP_INGEST === "true",

  // --- ElevenLabs TTS ---
  elevenLabsApiKey: env("ELEVENLABS_API_KEY"),
  elevenLabsVoiceId: env("ELEVENLABS_VOICE_ID"),
  elevenLabsModel: env("ELEVENLABS_MODEL", "eleven_flash_v2_5"),

  // --- Upload quotas (guard M0 disk) ---
  uploadMaxChunksPerUser: envInt("UPLOAD_MAX_CHUNKS_PER_USER", 500),
  uploadMaxDocsPerUser: envInt("UPLOAD_MAX_DOCS_PER_USER", 50),

  // --- retrieval / synthesis (real AI modules) ---
  /** Strict getter: throws when MONGODB_URI is missing (real store/retrieval). */
  get mongoUri() {
    return required("MONGODB_URI");
  },
  mongoDb: env("MONGODB_DB", "voxassist"),
  voyageModel: env("VOYAGE_MODEL", "voyage-3.5"),
  embeddingDim: Number(env("EMBEDDING_DIM", "1024")),
  /** All synthesis is Claude: small/fast for `ask`, Opus for `plan`. */
  askModel: env("CLAUDE_ASK_MODEL", "claude-haiku-4-5-20251001"),
  planModel: env("CLAUDE_PLAN_MODEL", "claude-opus-4-8"),
  collections: {
    chunks: "chunks",
    documents: "documents",
    users: "users",
  },
} as const;
