import "@/lib/config";
import { requireUserId } from "@/lib/auth";
import { getOrCreateUser } from "@/lib/identity";
import { resolveClerkUserIdToOwner } from "@/lib/users";

export const runtime = "nodejs";

/**
 * GET /api/me — upsert + return the caller's identity doc.
 * Additive groundwork; buildScope is unchanged for now.
 */
export async function GET() {
  const authed = await requireUserId();
  if ("response" in authed) return authed.response;

  const fallbackOwner = resolveClerkUserIdToOwner(authed.userId);
  const user = await getOrCreateUser(authed.userId, fallbackOwner);

  return Response.json({
    userId: user.userId,
    owner: user.owner,
    username: user.username,
    role: user.role,
  });
}
