import { locales } from "@repo/internationalization/utils";

const PLACEHOLDER_ORIGIN = "http://placeholder.invalid";

function isLocalePrefixed(path: string): boolean {
    return locales.some(
        (locale) => path === `/${locale}` || path.startsWith(`/${locale}/`)
    );
}

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
    if (!isLocalePrefixed(path)) {
        return fallback;
    }
    // The URL parser reads `\` as `/` and resolves `..`, so `/pt-br/../\evil.com` passes the
    // checks above and still parses to `//evil.com`, which leaves the host once made relative.
    const resolvedPath = new URL(path, PLACEHOLDER_ORIGIN).pathname;
    return isLocalePrefixed(resolvedPath) ? path : fallback;
}
