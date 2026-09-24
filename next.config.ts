import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image (see Dockerfile).
  output: "standalone",
  // sqlite-vec loads a platform-specific native extension at runtime; keep it out of
  // the bundle and make sure the binary is copied into the standalone output.
  serverExternalPackages: ["better-sqlite3", "sqlite-vec"],
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
