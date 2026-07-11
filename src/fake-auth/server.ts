/**
 * Fake-auth drop-in for @clerk/nextjs/server.
 * Activated by next.config.ts alias when NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is
 * empty. Session = `vox_user` cookie; the username IS the vault owner id.
 */

type AuthResult = { userId: string | null };

/** Route-handler auth(): read the fake session cookie. */
export async function auth(): Promise<AuthResult> {
  // Lazy import keeps next/headers out of the middleware bundle.
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  const raw = jar.get("vox_user")?.value ?? "";
  const userId = decodeURIComponent(raw).trim().toLowerCase();
  return { userId: userId || null };
}

type MiddlewareHandler = (
  authFn: (() => Promise<AuthResult>) & { protect: () => Promise<AuthResult> },
  req: Request,
) => Promise<unknown> | unknown;

/**
 * Passthrough middleware. API routes still enforce auth via requireUserId(),
 * so unauthenticated /api/ask etc. get a 401 from the route itself.
 */
export function clerkMiddleware(handler?: MiddlewareHandler) {
  return async (req: Request & { cookies?: { get(n: string): { value: string } | undefined } }) => {
    if (!handler) return undefined;
    const readUser = async (): Promise<AuthResult> => {
      const raw = req.cookies?.get?.("vox_user")?.value ?? "";
      const userId = decodeURIComponent(raw).trim().toLowerCase();
      return { userId: userId || null };
    };
    const authFn = Object.assign(readUser, { protect: readUser });
    await handler(authFn, req);
    return undefined;
  };
}

export function createRouteMatcher(patterns: string[]) {
  const regexes = patterns.map(
    (p) => new RegExp(`^${p.replace(/\(\.\*\)/g, ".*").replace(/\*/g, ".*")}$`),
  );
  return (req: { nextUrl?: { pathname: string }; url?: string }) => {
    const pathname = req.nextUrl?.pathname ?? (req.url ? new URL(req.url).pathname : "");
    return regexes.some((r) => r.test(pathname));
  };
}
