/**
 * Client-safe role registry for demo badges and user directory.
 * Developers = Void Stars; sample = seeded personas; everyone else = user.
 */

import { DEMO_USERNAMES } from "@/lib/demo-users";

export type UserRole = "developer" | "sample" | "user";

export const DEVELOPERS = ["momen", "rayan"] as const;

export const ROLE_LABEL: Record<UserRole, string> = {
  developer: "DEV",
  sample: "SAMPLE",
  user: "USER",
};

const DEVELOPER_SET = new Set<string>(DEVELOPERS);
const SAMPLE_SET = new Set<string>(DEMO_USERNAMES);

/** Resolve a username (vault owner) to a display role. */
export function roleFor(username: string): UserRole {
  const key = username.trim().toLowerCase();
  if (DEVELOPER_SET.has(key)) return "developer";
  if (SAMPLE_SET.has(key)) return "sample";
  return "user";
}
