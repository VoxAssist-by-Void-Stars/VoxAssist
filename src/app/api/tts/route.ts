import "@/lib/config";
import { requireUserId } from "@/lib/auth";
import { config } from "@/lib/config";
import { checkLlmRateLimit } from "@/lib/rateLimit";
import { ttsRequestSchema } from "@/lib/schemas";

export const runtime = "nodejs";

function jsonError(message: string, status: number, details?: unknown) {
  return Response.json(
    { error: message, ...(details !== undefined ? { details } : {}) },
    { status },
  );
}

/**
 * POST /api/tts — ElevenLabs text-to-speech stream.
 * Missing API key → 501 so the client can fall back to browser SpeechSynthesis.
 */
export async function POST(request: Request) {
  const authed = await requireUserId();
  if ("response" in authed) return authed.response;

  const limited = checkLlmRateLimit(authed.userId);
  if (limited) return jsonError(limited, 429);

  if (!config.elevenLabsApiKey || !config.elevenLabsVoiceId) {
    return jsonError(
      "ElevenLabs TTS is not configured (set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID)",
      501,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Expected JSON body", 400);
  }

  const parsed = ttsRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid request", 400, parsed.error.flatten());
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${config.elevenLabsVoiceId}`;
  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
        "xi-api-key": config.elevenLabsApiKey,
      },
      body: JSON.stringify({
        text: parsed.data.text,
        model_id: config.elevenLabsModel,
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "TTS request failed";
    return jsonError(message, 502);
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    return jsonError(
      `ElevenLabs TTS failed (${upstream.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`,
      502,
    );
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
