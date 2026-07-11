import type { NextConfig } from "next";
import path from "node:path";

/**
 * Auth mode is env-gated: with no Clerk publishable key, @clerk/nextjs is
 * aliased to src/fake-auth/* (demo fake auth — type a username to sign in).
 * Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY + CLERK_SECRET_KEY for real Clerk.
 */
const useFakeAuth = !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

const nextConfig: NextConfig = {
  // Slimmer Docker/DO image when using `node server.js` from .next/standalone
  output: "standalone",
  webpack: (cfg) => {
    if (useFakeAuth) {
      cfg.resolve.alias = {
        ...cfg.resolve.alias,
        "@clerk/nextjs/server$": path.resolve(process.cwd(), "src/fake-auth/server.ts"),
        "@clerk/nextjs$": path.resolve(process.cwd(), "src/fake-auth/client.tsx"),
      };
    }
    return cfg;
  },
};

export default nextConfig;
