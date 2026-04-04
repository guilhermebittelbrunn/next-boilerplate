import { config, withAnalyzer } from "@repo/next-config";
import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const monorepoRoot = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    ".."
);

let nextConfig: NextConfig = {
    ...config,
    turbopack: {
        ...config.turbopack,
        root: monorepoRoot,
    },
};

if (process.env.ANALYZE === "true") {
    nextConfig = withAnalyzer(nextConfig);
}

export default nextConfig;
