import "@/lib/config";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getGenerator, getRetriever } from "@/ai";
import type { PlanResponse } from "@/contract/types";
import { requireUserId } from "@/lib/auth";
import { config } from "@/lib/config";
import { planRequestSchema } from "@/lib/schemas";
import { buildScope } from "@/lib/scope";

export const runtime = "nodejs";

function jsonError(message: string, status: number, details?: unknown) {
  return Response.json(
    { error: message, ...(details !== undefined ? { details } : {}) },
    { status },
  );
}

function slugify(idea: string): string {
  const slug = idea
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "plan";
}

export async function POST(request: Request) {
  const authed = await requireUserId();
  if ("response" in authed) return authed.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = planRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid PlanRequest", 400, parsed.error.flatten());
  }

  const { idea, username } = parsed.data;
  const scoped = buildScope(authed.userId, username);
  if (!scoped.ok) {
    return jsonError(scoped.error, 404);
  }

  // Scope is passed through unchanged; retrieve enforces friend ⇒ shared === true.
  const { scope } = scoped;

  try {
    const retriever = await getRetriever();
    const generator = await getGenerator();
    const retrieval = await retriever.retrieve(idea, scope);
    const planned = await generator.plan(idea, retrieval);

    const slug = `${slugify(idea)}-${Date.now()}`;
    const outputDir = path.resolve(config.outputDir);
    await mkdir(outputDir, { recursive: true });
    const absolutePath = path.join(outputDir, `${slug}.md`);
    await writeFile(absolutePath, planned.brief, "utf8");

    const markdownPath = path.join(config.outputDir, `${slug}.md`).replace(
      /\\/g,
      "/",
    );

    const response: PlanResponse = {
      brief: planned.brief,
      citations: planned.citations,
      markdownPath,
    };

    return Response.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Plan failed";
    return jsonError(message, 500);
  }
}
