import { locales } from "@repo/internationalization/utils";

/**
 * Same-origin path from `redirect` query param (locale-prefixed paths only).
 */
export function postAuthRedirectTarget(
    rawRedirect: string | null,
    fallback: string
): string {
    if (!rawRedirect) {
        return fallback;
    }
    let path: string;
    try {
        path = decodeURIComponent(rawRedirect.trim());
    } catch {
        return fallback;
    }
    if (!(path.startsWith("/") && !path.startsWith("//"))) {
        return fallback;
    }
    if (path.includes("//")) {
        return fallback;
    }
    const isLocalePrefixed = locales.some(
        (l) => path === `/${l}` || path.startsWith(`/${l}/`)
    );
    return isLocalePrefixed ? path : fallback;
}
