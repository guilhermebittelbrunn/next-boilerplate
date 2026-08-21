import { config, withAnalyzer } from "@repo/next-config";
import type { NextConfig } from "next";

let nextConfig: NextConfig = config;

// Only use analyzer if explicitly set
if (process.env.ANALYZE === "true") {
  nextConfig = withAnalyzer(nextConfig);
}

export default nextConfig;
