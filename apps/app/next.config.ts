import path from "node:path";
import { fileURLToPath } from "node:url";
import { config, withAnalyzer } from "@repo/next-config";
import type { NextConfig } from "next";

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
    images: {
        domains: ["lh3.googleusercontent.com", "www.google.com"],
        remotePatterns: [
            {
                protocol: "https",
                hostname: "lh3.googleusercontent.com",
            },
        ],
    },
};

if (process.env.ANALYZE === "true") {
    nextConfig = withAnalyzer(nextConfig);
}

export default nextConfig;
