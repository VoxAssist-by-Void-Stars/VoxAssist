import "@/lib/config";
import { getGenerator, getRetriever } from "@/ai";
import { askRequestSchema } from "@/lib/schemas";

export const runtime = "nodejs";

function jsonError(message: string, status: number, details?: unknown) {
  return Response.json(
    { error: message, ...(details !== undefined ? { details } : {}) },
    { status },
  );
}

function encodeSse(event: string, data: unknown): Uint8Array {
  return new TextEncoder().encode(
    `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
  );
}

/** Split answer into small pieces for SSE token events. */
function chunkAnswer(answer: string, size = 48): string[] {
  if (!answer) return [""];
  const parts: string[] = [];
  for (let i = 0; i < answer.length; i += size) {
    parts.push(answer.slice(i, i + size));
  }
  return parts;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = askRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid AskRequest", 400, parsed.error.flatten());
  }

  const { question, scope } = parsed.data;

  try {
    const retriever = await getRetriever();
    const generator = await getGenerator();
    const retrieval = await retriever.retrieve(question, scope);
    const { answer, citations } = await generator.ask(question, retrieval);

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const text of chunkAnswer(answer)) {
          controller.enqueue(encodeSse("token", { text }));
        }
        controller.enqueue(encodeSse("citations", { citations }));
        controller.enqueue(encodeSse("done", {}));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ask failed";
    return jsonError(message, 500);
  }
}
