import type { Scope } from "@/contract/types";
import {
  resolveClerkUserIdToOwner,
  resolveUsernameToOwnerId,
} from "@/lib/users";

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
 *
 * Self-scope uses the vault owner mapped from Clerk userId (CLERK_OWNER_MAP),
 * so queries hit notes ingested with `--as momen` / `--as rayan`.
 */
export function buildScope(
  clerkUserId: string,
  targetUsername?: string | null,
): BuildScopeResult {
  const callerOwner = resolveClerkUserIdToOwner(clerkUserId);
  const trimmed = targetUsername?.trim();
  if (!trimmed) {
    return { ok: true, scope: { kind: "self", owner: callerOwner } };
  }

  const targetId = resolveUsernameToOwnerId(trimmed);
  if (!targetId) {
    return { ok: false, error: `Unknown username: ${trimmed}` };
  }

  return { ok: true, scope: { kind: "friend", owner: targetId } };
}
