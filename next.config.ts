import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Auth-gated App Router pages read session cookies at request time.
  // Cache Components can be re-enabled when layouts adopt Suspense boundaries.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
