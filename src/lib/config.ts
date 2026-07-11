/**
 * Central env config with sane defaults for local/dev.
 * Import this from API routes so defaults (esp. USE_MOCK_AI) apply before the AI factory runs.
 */

function env(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

// Default to mocks unless explicitly disabled — matches .env.example.
if (process.env.USE_MOCK_AI === undefined) {
  process.env.USE_MOCK_AI = "true";
}

export const config = {
  mongodbUri: env("MONGODB_URI"),
  voyageApiKey: env("VOYAGE_API_KEY"),
  geminiApiKey: env("GEMINI_API_KEY"),
  anthropicBaseUrl: env("ANTHROPIC_BASE_URL"),
  anthropicApiKey: env("ANTHROPIC_API_KEY"),
  clerkPublishableKey: env("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"),
  clerkSecretKey: env("CLERK_SECRET_KEY"),
  /** True when USE_MOCK_AI === "true" (default if unset). */
  useMockAi: process.env.USE_MOCK_AI === "true",
  /** Directory for /api/plan markdown briefs. */
  outputDir: env("OUTPUT_DIR", "./output"),
  /** Default owner for optional /api/ingest when body omits owner. */
  defaultIngestOwner: env("DEFAULT_INGEST_OWNER", "anonymous"),
} as const;
