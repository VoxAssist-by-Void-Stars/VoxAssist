/**
 * Seed checklist (run after Atlas + teammate store are ready).
 *
 * 1. Create Clerk users for personas momen + rayan; copy user_… ids.
 * 2. Set in .env / DO:
 *      CLERK_OWNER_MAP=user_MOMEN:momen,user_RAYAN:rayan
 * 3. Ingest:
 *      USE_MOCK_AI=false npm run ingest -- --vault ./sample-vault --as momen
 *      USE_MOCK_AI=false npm run ingest -- --vault ./sample-vault-rayan --as rayan
 * 4. Verify friend guardrail in UI: as momen, ask about rayan —
 *    expect shared projects/stack + collaboration; never private/interview.
 */

export const SEED_OWNERS = ["momen", "rayan"] as const;
export const SEED_VAULTS = {
  momen: "./sample-vault",
  rayan: "./sample-vault-rayan",
} as const;
