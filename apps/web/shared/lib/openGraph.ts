import { globalTranslations } from "@repo/internationalization/translations/global";
import { resolveLocale } from "@repo/internationalization/utils";
import { getBrand } from "@repo/next-config/brand";

export const OPEN_GRAPH_IMAGE_SIZE = { width: 1200, height: 630 } as const;
export const OPEN_GRAPH_TAGLINE_MAX_LENGTH = 160;

const LOGO_TIMEOUT_MS = 3000;
const SUPPORTED_LOGO_TYPES = new Set([
    "image/png",
    "image/jpeg",
    "image/svg+xml",
]);
const ELLIPSIS = "…";
const TRAILING_SEPARATORS_RE = /[\s,.;:]+$/;

export type OpenGraphCard = {
    brandName: string;
    logoUrl: string | null;
    tagline: string;
    alt: string;
};

export function truncateTagline(
    value: string,
    maxLength = OPEN_GRAPH_TAGLINE_MAX_LENGTH
): string {
    const text = value.trim();
    if (text.length <= maxLength) {
        return text;
    }

    const budget = text.slice(0, maxLength - ELLIPSIS.length);
    const lastSpace = budget.lastIndexOf(" ");
    const cut = lastSpace > 0 ? budget.slice(0, lastSpace) : budget;
    return `${cut.replace(TRAILING_SEPARATORS_RE, "")}${ELLIPSIS}`;
}

export function resolveOpenGraphCard(value: string): OpenGraphCard {
    const dictionary = globalTranslations[resolveLocale(value)];
    const brand = getBrand();
    const tagline = truncateTagline(
        dictionary.apps.web.pages.home.meta.description
    );

    return {
        brandName: brand.name,
        logoUrl: brand.logoUrl,
        tagline,
        alt: dictionary.apps.web.openGraph.imageAlt
            .replace("{brand}", brand.name)
            .replace("{tagline}", tagline),
    };
}

/**
 * Runs while the image is rendered at build time, so a slow or broken logo host must not
 * fail the build: every failure falls back to the monogram.
 */
export async function loadBrandLogo(
    url: string | null
): Promise<string | null> {
    if (!url) {
        return null;
    }

    try {
        const response = await fetch(url, {
            signal: AbortSignal.timeout(LOGO_TIMEOUT_MS),
        });
        const type =
            response.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
        if (!(response.ok && SUPPORTED_LOGO_TYPES.has(type))) {
            return null;
        }

        const encoded = Buffer.from(await response.arrayBuffer()).toString(
            "base64"
        );
        return `data:${type};base64,${encoded}`;
    } catch {
        return null;
    }
}
