/**
 * Owner existence checks against Atlas — the "does this friend exist" lookup
 * (a plain query, not a security boundary; retrieval enforces shared===true).
 */
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
