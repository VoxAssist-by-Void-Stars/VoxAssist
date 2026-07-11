// Readiness check for VoxAssist. Verifies env + MongoDB connectivity.
// Run: npm run doctor
import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

// Load VoxAssist/.env regardless of the current working directory.
loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "..", ".env") });

type Check = { name: string; ok: boolean; detail: string };

async function main() {
  const checks: Check[] = [];

  const envSet = (name: string): boolean => {
    const ok = !!process.env[name]?.trim();
    checks.push({ name, ok, detail: ok ? "set" : "MISSING" });
    return ok;
  };

  envSet("ANTHROPIC_API_KEY");
  const hasMongo = envSet("MONGODB_URI");
  envSet("VOYAGE_API_KEY");

  checks.push({ name: "MONGODB_DB", ok: true, detail: process.env.MONGODB_DB || "voxassist (default)" });
  checks.push({ name: "VOYAGE_MODEL", ok: true, detail: process.env.VOYAGE_MODEL || "voyage-3.5 (default)" });
  checks.push({ name: "EMBEDDING_DIM", ok: true, detail: String(process.env.EMBEDDING_DIM || 1024) });

  if (hasMongo) {
    try {
      const { ping, getClient } = await import("../src/lib/db");
      await ping();
      checks.push({ name: "MongoDB ping", ok: true, detail: "connected" });
      (await getClient()).close();
    } catch (e) {
      checks.push({ name: "MongoDB ping", ok: false, detail: (e as Error).message });
    }
  } else {
    checks.push({ name: "MongoDB ping", ok: false, detail: "skipped (MONGODB_URI not set)" });
  }

  console.log("\nVoxAssist doctor");
  console.log("────────────────");
  for (const c of checks) {
    console.log(`${c.ok ? "OK " : "XX "} ${c.name.padEnd(18)} ${c.detail}`);
  }

  const blockers = checks.filter((c) => !c.ok);
  console.log("");
  if (blockers.length === 0) {
    console.log("All green — ready for M1 (create the Atlas vector + search indexes).");
  } else {
    console.log(`${blockers.length} item(s) to resolve before M1:`);
    for (const b of blockers) console.log(`  - ${b.name}: ${b.detail}`);
    console.log("Add them to VoxAssist/.env (template in .env.example).");
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
