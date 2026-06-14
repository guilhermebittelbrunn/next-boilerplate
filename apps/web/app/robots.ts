import type { MetadataRoute } from "next";
import { getWebBaseUrl } from "@/shared/lib/seo";

export default function robots(): MetadataRoute.Robots {
    const baseUrl = getWebBaseUrl();
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            // Auth pages have no SEO value across locales.
            disallow: ["/*/sign-in", "/*/sign-up"],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
