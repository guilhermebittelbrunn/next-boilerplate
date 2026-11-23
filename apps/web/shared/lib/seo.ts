import {
    getDefaultLocale,
    type Locale,
    locales,
    resolveLocale,
} from "@repo/internationalization/utils";
import { getBrand } from "@repo/next-config/brand";
import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";
import {
    OPEN_GRAPH_IMAGE_SIZE,
    resolveOpenGraphCard,
} from "@/shared/lib/openGraph";

const OG_LOCALES: Record<string, string> = {
    "pt-br": "pt_BR",
    en: "en_US",
    es: "es_ES",
};

const TRAILING_SLASH_RE = /\/+$/;
const PROTOCOL_RE = /^https?:\/\//;

type PageMeta = { title: string; description: string; image?: string };

/** Normalize a host/URL env value into an absolute origin (no trailing slash). */
function normalizeOrigin(value: string): string {
    const trimmed = value.trim().replace(TRAILING_SLASH_RE, "");
    return PROTOCOL_RE.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/**
 * Absolute web base URL for JSON-LD + sitemap/robots. Localized metadata below
 * uses relative paths (Next resolves them against `metadataBase`). Tolerates env
 * values with or without a protocol.
 */
export function getWebBaseUrl(): string {
    const { siteUrl } = getBrand();
    if (siteUrl) {
        return siteUrl;
    }
    const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
    if (vercelHost) {
        return normalizeOrigin(vercelHost);
    }
    return "http://localhost:3001";
}

/** Absolute, so crawlers that ignore `metadataBase` still resolve the share image. */
export function openGraphImageUrl(locale: Locale): string {
    return `${getWebBaseUrl()}/${locale}/opengraph-image`;
}

/**
 * Page metadata with i18n SEO: canonical + hreflang `alternates` for every
 * locale (+ x-default) and a locale-specific Open Graph locale. `path` is the
 * route without the locale prefix (e.g. "" for home, "/pricing").
 *
 * The share image is declared here, not left to the `opengraph-image` file of the
 * layout: Next replaces the whole `openGraph` object a page exports, so the layout's
 * image would never reach a page that sets its own Open Graph locale.
 *
 * `indexable: false` keeps a page out of search results while leaving it crawlable,
 * which a `Disallow` in robots.txt would not: a blocked page is never read, so its
 * `noindex` is never seen.
 */
export function buildLocaleMetadata({
    meta,
    locale,
    path = "",
    indexable = true,
}: {
    meta: PageMeta;
    locale: string;
    path?: string;
    indexable?: boolean;
}): Metadata {
    const card = resolveOpenGraphCard(locale);
    const languages: Record<string, string> = {};
    for (const supported of locales) {
        languages[supported] = `/${supported}${path}`;
    }
    languages["x-default"] = `/${getDefaultLocale()}${path}`;

    return createMetadata({
        ...meta,
        alternates: {
            canonical: `/${locale}${path}`,
            languages,
        },
        openGraph: {
            locale: OG_LOCALES[locale] ?? "en_US",
            images: [
                {
                    url: openGraphImageUrl(resolveLocale(locale)),
                    ...OPEN_GRAPH_IMAGE_SIZE,
                    alt: card.alt,
                },
            ],
        },
        ...(indexable ? {} : { robots: { index: false, follow: true } }),
    });
}
