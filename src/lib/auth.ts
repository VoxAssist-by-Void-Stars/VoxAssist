import { auth } from "@clerk/nextjs/server";

/** Require a Clerk session; returns userId or a 401 Response. */
export async function requireUserId(): Promise<
  { userId: string } | { response: Response }
> {
  const { userId } = await auth();
  if (!userId) {
    return {
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { userId };
}
