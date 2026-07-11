import type { Scope } from "@/contract/types";
import { resolveUsernameToOwnerId } from "@/lib/users";

export type BuildScopeResult =
  | { ok: true; scope: Scope }
  | { ok: false; error: string };

/**
 * Build retrieval Scope from the authenticated caller + optional friend username.
 *
 * Guardrail: friend-scope results must be limited to `shared === true` documents.
 * This API only builds and passes Scope; the teammate's `IRetriever.retrieve`
 * enforces the shared flag. Resolving a username is a lookup to an owner id,
 * never a permission bypass.
 */
export function buildScope(
  callerId: string,
  targetUsername?: string | null,
): BuildScopeResult {
  const trimmed = targetUsername?.trim();
  if (!trimmed) {
    return { ok: true, scope: { kind: "self", owner: callerId } };
  }

  const targetId = resolveUsernameToOwnerId(trimmed);
  if (!targetId) {
    return { ok: false, error: `Unknown username: ${trimmed}` };
  }

  return { ok: true, scope: { kind: "friend", owner: targetId } };
}
