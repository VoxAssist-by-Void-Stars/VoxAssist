import "@/lib/config";
import { requireUserId } from "@/lib/auth";
import { config } from "@/lib/config";
import { checkLlmRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

/** Max upload size for a push-to-talk clip (~10MB). */
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

function jsonError(message: string, status: number, details?: unknown) {
  return Response.json(
    { error: message, ...(details !== undefined ? { details } : {}) },
    { status },
  );
}

/**
 * POST /api/stt — ElevenLabs Scribe speech-to-text (batch).
 * Expects multipart/form-data with a `file` audio field.
 * Missing API key → 501 so the client can show a clear unavailable message.
 */
export async function POST(request: Request) {
  const authed = await requireUserId();
  if ("response" in authed) return authed.response;

  const limited = checkLlmRateLimit(authed.userId);
  if (limited) return jsonError(limited, 429);

  if (!config.elevenLabsApiKey) {
    return jsonError(
      "ElevenLabs STT is not configured (set ELEVENLABS_API_KEY)",
      501,
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("Expected multipart/form-data body", 400);
  }

  const file = form.get("file");
  if (typeof file === "string" || !file || !(file instanceof Blob)) {
    return jsonError('Missing audio "file" field', 400);
  }
  if (file.size === 0) {
    return jsonError("Audio file is empty", 400);
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return jsonError(
      `Audio file too large (max ${MAX_AUDIO_BYTES / (1024 * 1024)}MB)`,
      413,
    );
  }

  const upstreamForm = new FormData();
  const filename =
    file instanceof File && file.name ? file.name : "recording.webm";
  upstreamForm.append("file", file, filename);
  upstreamForm.append("model_id", config.elevenLabsSttModel);
  upstreamForm.append("language_code", "eng");

  let upstream: Response;
  try {
    upstream = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: {
        "xi-api-key": config.elevenLabsApiKey,
      },
      body: upstreamForm,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "STT request failed";
    return jsonError(message, 502);
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    return jsonError(
      `ElevenLabs STT failed (${upstream.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`,
      502,
    );
  }

  let payload: unknown;
  try {
    payload = await upstream.json();
  } catch {
    return jsonError("ElevenLabs STT returned invalid JSON", 502);
  }

  const text =
    typeof payload === "object" &&
    payload !== null &&
    "text" in payload &&
    typeof (payload as { text: unknown }).text === "string"
      ? (payload as { text: string }).text.trim()
      : "";

  if (!text) {
    return jsonError("No speech detected in the audio", 422);
  }

  return Response.json({ text });
}
