import { MongoClient, type Db } from "mongodb";
import { config } from "./config";

// Cache the connection promise across Next.js hot reloads / serverless invocations.
declare global {
  // eslint-disable-next-line no-var
  var _voxassistMongo: Promise<MongoClient> | undefined;
}

export function getClient(): Promise<MongoClient> {
  if (!global._voxassistMongo) {
    const client = new MongoClient(config.mongoUri, {
      // Fail fast so a blocked/misconfigured connection surfaces a clear error
      // instead of hanging a request for the 30s default.
      serverSelectionTimeoutMS: 10_000,
    });
    global._voxassistMongo = client.connect().catch((err) => {
      // Never cache a failed connection: clearing the global lets the next
      // request retry. Otherwise a transient failure (e.g. an Atlas IP-allowlist
      // change that hasn't propagated yet) would poison the process until it
      // restarts.
      global._voxassistMongo = undefined;
      throw err;
    });
  }
  return global._voxassistMongo;
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db(config.mongoDb);
}

/** Lightweight connectivity check. */
export async function ping(): Promise<void> {
  const db = await getDb();
  await db.command({ ping: 1 });
}
