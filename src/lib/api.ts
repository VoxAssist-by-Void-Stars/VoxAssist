/**
 * Browser client for VoxAssist API routes.
 * Maps UI Scope → auth-aware body ({ question|idea, username? }) and parses
 * the server SSE protocol (event: token | citations | done).
 */

import type {
  AskRequest,
  Citation,
  PlanRequest,
  PlanResponse,
  Scope,
} from "@/lib/contract";

export interface AskStreamHandlers {
  onDelta: (text: string) => void;
  onCitations?: (citations: Citation[]) => void;
  signal?: AbortSignal;
}

function bodyFromScope(
  fields: { question?: string; idea?: string },
  scope: Scope,
): Record<string, string> {
  const body: Record<string, string> = {};
  if (fields.question !== undefined) body.question = fields.question;
  if (fields.idea !== undefined) body.idea = fields.idea;
  // Friend scope: AskBox puts the target username in scope.owner.
  if (scope.kind === "friend") body.username = scope.owner;
  return body;
}

/**
 * POST /api/ask and consume the SSE stream.
 * Server frames:
 *   event: token      data: { "text": "..." }
 *   event: citations  data: { "citations": Citation[] }
 *   event: done       data: {}
 */
export async function streamAsk(
  req: AskRequest,
  handlers: AskStreamHandlers,
): Promise<void> {
  const res = await fetch("/api/ask", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bodyFromScope({ question: req.question }, req.scope)),
    signal: handlers.signal,
  });

  if (res.status === 401) {
    throw new Error("Unauthorized — sign in to ask.");
  }
  if (!res.ok || !res.body) {
    let detail = `ask failed: ${res.status}`;
    try {
      const err = (await res.json()) as { error?: string };
      if (err.error) detail = err.error;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const evt of events) {
      if (!evt.trim()) continue;
      let eventName = "message";
      let dataLine = "";
      for (const line of evt.split("\n")) {
        if (line.startsWith("event:")) eventName = line.slice(6).trim();
        else if (line.startsWith("data:")) dataLine = line.slice(5).trim();
      }
      if (!dataLine || dataLine === "[DONE]") continue;

      try {
        const msg = JSON.parse(dataLine) as {
          type?: string;
          text?: string;
          citations?: Citation[];
        };

        // Our server protocol (event name)
        if (eventName === "token" && typeof msg.text === "string") {
          handlers.onDelta(msg.text);
          continue;
        }
        if (eventName === "citations") {
          handlers.onCitations?.(msg.citations ?? []);
          continue;
        }
        if (eventName === "done") continue;

        // Fallback: typed JSON payloads
        if (msg.type === "delta" && typeof msg.text === "string") {
          handlers.onDelta(msg.text);
        } else if (msg.type === "citations") {
          handlers.onCitations?.(msg.citations ?? []);
        }
      } catch {
        // ignore malformed frames
      }
    }
  }
}

/** POST /api/plan and return the generated brief + citations. */
export async function requestPlan(req: PlanRequest): Promise<PlanResponse> {
  const res = await fetch("/api/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bodyFromScope({ idea: req.idea }, req.scope)),
  });

  if (res.status === 401) {
    throw new Error("Unauthorized — sign in to plan.");
  }
  if (!res.ok) {
    let detail = `plan failed: ${res.status}`;
    try {
      const err = (await res.json()) as { error?: string };
      if (err.error) detail = err.error;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  return (await res.json()) as PlanResponse;
}
