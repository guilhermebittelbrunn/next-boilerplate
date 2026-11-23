import path from "node:path";
import { fileURLToPath } from "node:url";
import { config, withAnalyzer } from "@repo/next-config";
import type { NextConfig } from "next";

const monorepoRoot = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    ".."
);

const storageBucket =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim() || undefined;

let nextConfig: NextConfig = {
    ...config,
    turbopack: {
        ...config.turbopack,
        root: monorepoRoot,
    },
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "lh3.googleusercontent.com",
            },
            // Signed URLs are path-style, so the bucket is the first path segment: any
            // other bucket on the same host stays out of the optimizer.
            ...(storageBucket
                ? [
                      {
                          protocol: "https" as const,
                          hostname: "storage.googleapis.com",
                          pathname: `/${storageBucket}/**`,
                      },
                  ]
                : []),
        ],
    },
};

if (process.env.ANALYZE === "true") {
    nextConfig = withAnalyzer(nextConfig);
}

export default nextConfig;
