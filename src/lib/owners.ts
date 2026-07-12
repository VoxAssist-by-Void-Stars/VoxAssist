/**
 * Owner existence checks against Atlas — the "does this friend exist" lookup
 * (a plain query, not a security boundary; retrieval enforces shared===true).
 */
import { DEMO_USERNAMES } from "@/lib/demo-users";
import { config } from "@/lib/config";
import { getDb } from "@/lib/db";

/** True when the owner has at least one shared chunk (friend-queryable). */
export async function ownerHasSharedNotes(owner: string): Promise<boolean> {
  // Mock mode has no DB — accept and let mocks answer.
  if (config.useMockAi) return true;
  const db = await getDb();
  const hit = await db
    .collection(config.collections.chunks)
    .findOne({ owner, shared: true }, { projection: { _id: 1 } });
  return hit !== null;
}

/** Distinct owners that have at least one shared chunk (directory listing). */
export async function listSharedOwners(): Promise<string[]> {
  if (config.useMockAi) return [...DEMO_USERNAMES];
  const db = await getDb();
  const owners = await db
    .collection(config.collections.chunks)
    .distinct("owner", { shared: true });
  return (owners as string[])
    .filter((o) => typeof o === "string" && o.length > 0)
    .sort((a, b) => a.localeCompare(b));
}

/** Chunk count for an owner (upload quota). Mock mode returns 0. */
export async function countOwnerChunks(owner: string): Promise<number> {
  if (config.useMockAi) return 0;
  const db = await getDb();
  return db.collection(config.collections.chunks).countDocuments({ owner });
}

/** Document count for an owner (upload quota). Mock mode returns 0. */
export async function countOwnerDocuments(owner: string): Promise<number> {
  if (config.useMockAi) return 0;
  const db = await getDb();
  return db.collection(config.collections.documents).countDocuments({ owner });
}
