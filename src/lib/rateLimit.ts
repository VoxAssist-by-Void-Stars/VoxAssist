import { config } from "@/lib/config";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Simple in-memory per-user rate limit for live LLM calls.
 * Returns null if allowed, or an error message if limited.
 * Disabled when LLM_RATE_LIMIT_PER_MINUTE is 0.
 */
export function checkLlmRateLimit(userId: string): string | null {
  const limit = config.llmRateLimitPerMinute;
  if (limit <= 0) return null;

  const now = Date.now();
  const windowMs = 60_000;
  let bucket = buckets.get(userId);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(userId, bucket);
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return `Rate limit exceeded (${limit}/min). Try again shortly.`;
  }
  return null;
}
