import { locales } from "@repo/internationalization/utils";

/**
 * Prefixes an app path with `/${locale}` when it is not already locale-prefixed.
 * Use for `href`, `router.push`, and breadcrumbs so navigation stays on the active locale.
 */
export function withLocalePath(locale: string, path: string): string {
    const normalized = path.startsWith("/") ? path : `/${path}`;
    const isLocalePrefixed = locales.some(
        (l) => normalized === `/${l}` || normalized.startsWith(`/${l}/`)
    );
    if (isLocalePrefixed) {
        return normalized;
    }
    if (normalized === "/") {
        return `/${locale}`;
    }
    return `/${locale}${normalized}`;
}
