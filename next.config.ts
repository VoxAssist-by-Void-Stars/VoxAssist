import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Slimmer Docker/DO image when using `node server.js` from .next/standalone
  output: "standalone",
};

export default nextConfig;
