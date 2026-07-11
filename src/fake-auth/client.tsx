"use client";

/**
 * Fake-auth drop-in for @clerk/nextjs (client side).
 *
 * Activated by next.config.ts alias when NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is
 * empty — matching the PROJECT.md locked decision: sign in = type a username,
 * no verification. Set real Clerk keys and this module is never bundled.
 *
 * Session = `vox_user` cookie. The username IS the vault owner id.
 */
import type { FormEvent, ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { ArrowRight, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEMO_USERNAMES } from "@/lib/demo-users";

const COOKIE = "vox_user";

function readCookie(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|;\s*)vox_user=([^;]*)/);
  const v = m ? decodeURIComponent(m[1]).trim() : "";
  return v || null;
}

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

function signIn(username: string) {
  const u = normalizeUsername(username);
  if (!u) return;
  document.cookie = `${COOKIE}=${encodeURIComponent(u)}; path=/; max-age=604800; samesite=lax`;
  window.location.reload();
}

function signOut() {
  document.cookie = `${COOKIE}=; path=/; max-age=0`;
  window.location.reload();
}

/** null = signed out, string = username, undefined = not yet hydrated */
const UserContext = createContext<string | null | undefined>(undefined);

export function ClerkProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    setUser(readCookie());
  }, []);
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

export function SignedIn({ children }: { children: ReactNode }) {
  const user = useContext(UserContext);
  return user ? <>{children}</> : null;
}

export function SignedOut({ children }: { children: ReactNode }) {
  const user = useContext(UserContext);
  // undefined (hydrating) renders nothing to avoid a sign-in flash.
  return user === null ? <>{children}</> : null;
}

/** Fake sign-in form — renders where Clerk's <SignIn /> would. */
export function SignIn(_props: Record<string, unknown>) {
  const [username, setUsername] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    signIn(username);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <h2 className="text-xl font-semibold tracking-tight">Sign in</h2>
        <p className="text-sm text-muted-foreground">
          Demo auth — enter any username, no password. Your username is your vault.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="fake-auth-username">Username</Label>
        <Input
          id="fake-auth-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="e.g. alex"
          autoComplete="username"
          autoFocus
        />
      </div>
      <Button type="submit" className="w-full" disabled={!normalizeUsername(username)}>
        Continue
        <ArrowRight className="ml-1.5 size-4" aria-hidden="true" />
      </Button>
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Seeded demo users:</p>
        <div className="flex flex-wrap gap-2">
          {DEMO_USERNAMES.map((u) => (
            <Button
              key={u}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => signIn(u)}
            >
              {u}
            </Button>
          ))}
        </div>
      </div>
    </form>
  );
}

/** Shows the current user + signs out on click (Clerk UserButton stand-in). */
export function UserButton(_props: Record<string, unknown>) {
  const user = useContext(UserContext);
  if (!user) return null;
  return (
    <Button variant="outline" size="sm" onClick={signOut} title="Sign out">
      <span className="mr-1.5 font-medium">{user}</span>
      <LogOut className="size-3.5" aria-hidden="true" />
    </Button>
  );
}

export function useUser() {
  const user = useContext(UserContext);
  if (!user) {
    return { isLoaded: user !== undefined, isSignedIn: false, user: null } as const;
  }
  return {
    isLoaded: true,
    isSignedIn: true,
    user: {
      id: user,
      username: user,
      primaryEmailAddress: { emailAddress: `${user}@voxassist.demo` },
    },
  } as const;
}
