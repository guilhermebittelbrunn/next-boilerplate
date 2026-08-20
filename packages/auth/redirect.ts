import { locales } from "@repo/internationalization/utils";

/**
 * Sanitizes the `redirect` query param set by the proxy into a safe destination.
 *
 * Open-redirect guard: only same-origin, locale-prefixed paths pass. Anything else —
 * absolute URLs, protocol-relative `//host`, paths without a locale segment — falls back
 * to the caller's default.
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
        (locale) => path === `/${locale}` || path.startsWith(`/${locale}/`)
    );
    return isLocalePrefixed ? path : fallback;
}
