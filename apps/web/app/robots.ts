import type { MetadataRoute } from "next";
import { getWebBaseUrl } from "@/shared/lib/seo";

export default function robots(): MetadataRoute.Robots {
    const baseUrl = getWebBaseUrl();
    return {
        rules: {
            userAgent: "*",
            allow: "/",
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
