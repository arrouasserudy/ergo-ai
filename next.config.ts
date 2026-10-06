import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image (see Dockerfile).
  output: "standalone",
  // sqlite-vec loads a platform-specific native extension at runtime; keep it out of
  // the bundle and make sure the binary is copied into the standalone output.
  // The Claude Agent SDK spawns its CLI from a platform binary package (copied by the Dockerfile).
  serverExternalPackages: ["better-sqlite3", "sqlite-vec", "@anthropic-ai/claude-agent-sdk"],
  experimental: {
    // PDF uploads to the expert's library (max 20 MB, see lib/expert/uploads.ts),
    // plus multipart overhead. The proxy would otherwise truncate bodies over 10 MB.
    serverActions: { bodySizeLimit: "21mb" },
    proxyClientMaxBodySize: "21mb",
  },
  outputFileTracingIncludes: {
    "/**": ["./node_modules/.pnpm/sqlite-vec-*/node_modules/sqlite-vec-*/*"],
  },
};

export default nextConfig;
