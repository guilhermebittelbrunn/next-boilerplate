import { getDefaultLocale, locales } from "@repo/internationalization/utils";
import { createMetadata } from "@repo/seo/metadata";
import type { Metadata } from "next";

const OG_LOCALES: Record<string, string> = {
    "pt-br": "pt_BR",
    en: "en_US",
    es: "es_ES",
};

const TRAILING_SLASH_RE = /\/+$/;
const PROTOCOL_RE = /^https?:\/\//;

type PageMeta = { title: string; description: string; image?: string };

/** Brand name (env-configurable, neutral default). Used in SEO + header/footer. */
export function getAppName(): string {
    return process.env.NEXT_PUBLIC_APP_NAME || "next-boilerplate";
}

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
    const fromEnv =
        process.env.NEXT_PUBLIC_WEB_URL ||
        process.env.VERCEL_PROJECT_PRODUCTION_URL;
    if (fromEnv) {
        return normalizeOrigin(fromEnv);
    }
    return "http://localhost:3001";
}

/**
 * Page metadata with i18n SEO: canonical + hreflang `alternates` for every
 * locale (+ x-default) and a locale-specific Open Graph locale. `path` is the
 * route without the locale prefix (e.g. "" for home, "/pricing").
 */
export function buildLocaleMetadata({
    meta,
    locale,
    path = "",
}: {
    meta: PageMeta;
    locale: string;
    path?: string;
}): Metadata {
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
        },
    });
}
