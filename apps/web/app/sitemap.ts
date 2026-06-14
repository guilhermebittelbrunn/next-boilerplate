import { locales } from "@repo/internationalization/utils";
import type { MetadataRoute } from "next";
import { getWebBaseUrl } from "@/shared/lib/seo";

/** Public routes (path without locale prefix) with SEO weights. */
const routes: {
    path: string;
    priority: number;
    changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
}[] = [
    { path: "", priority: 1, changeFrequency: "weekly" },
    { path: "/pricing", priority: 0.8, changeFrequency: "monthly" },
    { path: "/contact", priority: 0.5, changeFrequency: "yearly" },
    { path: "/legal/privacy", priority: 0.3, changeFrequency: "yearly" },
    { path: "/legal/terms", priority: 0.3, changeFrequency: "yearly" },
];

const sitemap = (): MetadataRoute.Sitemap => {
    const baseUrl = getWebBaseUrl();
    const lastModified = new Date();

    return routes.flatMap((route) =>
        locales.map((locale) => ({
            url: `${baseUrl}/${locale}${route.path}`,
            lastModified,
            changeFrequency: route.changeFrequency,
            priority: route.priority,
            alternates: {
                languages: Object.fromEntries(
                    locales.map((alt) => [
                        alt,
                        `${baseUrl}/${alt}${route.path}`,
                    ])
                ),
            },
        }))
    );
};

export default sitemap;
