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
 *
 * Expects the value already decoded once, as `URLSearchParams.get` returns it. Decoding it
 * again would turn an encoded `%26` or `%25` inside the destination's own query into `&`
 * or `%`, corrupting the destination or throwing on a stray `%`.
 */
export function postAuthRedirectTarget(
    rawRedirect: string | null,
    fallback: string
): string {
    if (!rawRedirect) {
        return fallback;
    }
    const path = rawRedirect.trim();
    if (!(path.startsWith("/") && !path.startsWith("//"))) {
        return fallback;
    }
    if (path.includes("//")) {
        return fallback;
    }
    if (!isLocalePrefixed(path)) {
        return fallback;
    }
    // The URL parser reads `\` as `/`, drops tab and newline characters and resolves `..`, so
    // `/pt-br/../\evil.com` or `/pt-br/\t/evil.com` pass the checks above and still parse to a
    // path with `//`, which turns into a host as soon as anything collapses the locale segment.
    const resolvedPath = new URL(path, PLACEHOLDER_ORIGIN).pathname;
    return isLocalePrefixed(resolvedPath) && !resolvedPath.includes("//")
        ? path
        : fallback;
}
