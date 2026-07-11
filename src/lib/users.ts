/**
 * Demo username → vault owner id, and Clerk userId → owner mapping.
 *
 * Owner ids must match DocumentMeta.owner / ingest `--as` values for retrieval to hit.
 * Set CLERK_OWNER_MAP=user_xxx:momen,user_yyy:rayan after creating Clerk persona accounts.
 */

import { config } from "@/lib/config";

const USERNAME_TO_OWNER_ID: Record<string, string> = {
  momen: "momen",
  "omen-mali": "momen",
  omen: "momen",
  rayan: "rayan",
  cynicald: "rayan",
};

/** Parse CLERK_OWNER_MAP env (userId:owner pairs). */
function parseClerkOwnerMap(): Record<string, string> {
  const raw = config.clerkOwnerMap.trim();
  if (!raw) return {};
  const out: Record<string, string> = {};
  for (const part of raw.split(",")) {
    const [userId, owner] = part.split(":").map((s) => s.trim());
    if (userId && owner) out[userId] = owner;
  }
  return out;
}

/** Resolve a login username to the vault `owner` id. Case-insensitive. */
export function resolveUsernameToOwnerId(
  username: string,
): string | undefined {
  const key = username.trim().toLowerCase();
  return USERNAME_TO_OWNER_ID[key];
}

/**
 * Map Clerk userId to vault owner used in ingestion.
 * Falls back to the raw userId when no mapping is configured (dev / first login).
 */
export function resolveClerkUserIdToOwner(userId: string): string {
  const map = parseClerkOwnerMap();
  return map[userId] ?? userId;
}

export function listDemoUsernames(): string[] {
  return [...new Set(Object.values(USERNAME_TO_OWNER_ID))];
}
