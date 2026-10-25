import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cada worktree e deploy observa somente o próprio projeto.
  outputFileTracingRoot: process.cwd(),
  // Identificador público gravado no bundle, não obtido do servidor ao abrir.
  env: {
    NEXT_PUBLIC_SERVICE_VERSION: process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || "local",
  },
};

export default nextConfig;
