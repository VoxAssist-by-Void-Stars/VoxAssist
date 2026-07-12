import "@/lib/config";
import { requireUserId } from "@/lib/auth";
import { listSharedOwners } from "@/lib/owners";
import { roleFor } from "@/lib/roles";

export const runtime = "nodejs";

/**
 * Directory of vault owners with shared notes (for friend-scope lookup UI).
 * Additive read endpoint — no behavior change for ask/plan.
 */
export async function GET() {
  const authed = await requireUserId();
  if ("response" in authed) return authed.response;

  const usernames = await listSharedOwners();
  const users = usernames.map((username) => ({
    username,
    role: roleFor(username),
  }));

  return Response.json({ users });
}
