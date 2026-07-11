import { MongoClient, type Db } from "mongodb";
import { config } from "./config";

// Cache the connection promise across Next.js hot reloads / serverless invocations.
declare global {
  // eslint-disable-next-line no-var
  var _voxassistMongo: Promise<MongoClient> | undefined;
}

export function getClient(): Promise<MongoClient> {
  if (!global._voxassistMongo) {
    const client = new MongoClient(config.mongoUri);
    global._voxassistMongo = client.connect();
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
