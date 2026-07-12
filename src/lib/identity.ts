/**
 * Clerk identity groundwork — upsert caller into the reserved `users` collection.
 * Does NOT change buildScope yet (ask/plan behavior stays identical).
 */

import { config } from "@/lib/config";
import { getDb } from "@/lib/db";
import { roleFor, type UserRole } from "@/lib/roles";
import { resolveClerkUserIdToOwner } from "@/lib/users";

export interface AppUser {
  userId: string;
  owner: string;
  username: string;
  role: UserRole;
  createdAt: Date;
}

/**
 * Upsert a user doc keyed by Clerk userId.
 * Owner prefers an existing stored value; otherwise falls back to
 * resolveClerkUserIdToOwner (CLERK_OWNER_MAP / raw userId).
 */
export async function getOrCreateUser(
  userId: string,
  username?: string,
): Promise<AppUser> {
  const fallbackOwner = resolveClerkUserIdToOwner(userId);
  const displayName = (username?.trim() || fallbackOwner).toLowerCase();

  // Mock / keyless mode: no Mongo — return an in-memory shape.
  if (config.useMockAi || !config.mongodbUri) {
    return {
      userId,
      owner: fallbackOwner,
      username: displayName,
      role: roleFor(displayName),
      createdAt: new Date(),
    };
  }

  const db = await getDb();
  const col = db.collection(config.collections.users);
  const existing = await col.findOne<{
    userId: string;
    owner?: string;
    username?: string;
    role?: UserRole;
    createdAt?: Date;
  }>({ userId });

  if (existing) {
    const owner = existing.owner || fallbackOwner;
    let name = existing.username || displayName;
    if (username?.trim()) {
      const nextName = username.trim().toLowerCase();
      if (nextName !== existing.username) {
        name = nextName;
        await col.updateOne(
          { userId },
          { $set: { username: name, role: roleFor(name) } },
        );
      }
    }
    return {
      userId,
      owner,
      username: name,
      role: roleFor(name),
      createdAt: existing.createdAt ?? new Date(),
    };
  }

  const doc: AppUser = {
    userId,
    owner: fallbackOwner,
    username: displayName,
    role: roleFor(displayName),
    createdAt: new Date(),
  };
  await col.insertOne(doc);
  return doc;
}

/**
 * Resolve vault owner for a Clerk userId.
 * Prefers the stored users-collection owner; falls back to CLERK_OWNER_MAP.
 */
export async function resolveOwner(userId: string): Promise<string> {
  if (config.useMockAi || !config.mongodbUri) {
    return resolveClerkUserIdToOwner(userId);
  }
  try {
    const db = await getDb();
    const existing = await db
      .collection(config.collections.users)
      .findOne<{ owner?: string }>({ userId }, { projection: { owner: 1 } });
    if (existing?.owner) return existing.owner;
  } catch {
    /* fall through */
  }
  return resolveClerkUserIdToOwner(userId);
}
