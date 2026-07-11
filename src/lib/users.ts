/**
 * Demo username → owner id map.
 * Owner ids must match DocumentMeta.owner / ingest `--as` values for retrieval to hit.
 * Replace with a real users collection when auth is productionized.
 */
const USERNAME_TO_OWNER_ID: Record<string, string> = {
  momen: "momen",
  "omen-mali": "momen",
  omen: "momen",
  rayan: "rayan",
  cynicald: "rayan",
};

/** Resolve a login username to the vault `owner` id. Case-insensitive. */
export function resolveUsernameToOwnerId(
  username: string,
): string | undefined {
  const key = username.trim().toLowerCase();
  return USERNAME_TO_OWNER_ID[key];
}

export function listDemoUsernames(): string[] {
  return [...new Set(Object.keys(USERNAME_TO_OWNER_ID))];
}
