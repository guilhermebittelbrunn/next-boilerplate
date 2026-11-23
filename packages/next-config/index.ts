import withBundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

export const config: NextConfig = {
    poweredByHeader: false,
    images: {
        formats: ["image/avif", "image/webp"],
    },
};

export const withAnalyzer = (sourceConfig: NextConfig): NextConfig =>
    withBundleAnalyzer()(sourceConfig);
