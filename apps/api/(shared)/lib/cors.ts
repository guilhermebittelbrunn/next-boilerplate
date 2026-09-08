import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";

/**
 * Ports the front-ends listen on in this repository. Used only when `CORS_ORIGIN`
 * is unset outside production, so a freshly cloned fork talks to its own API on
 * day one without configuration. It is still an allowlist, never a wildcard.
 */
const DEVELOPMENT_ORIGINS = ["http://localhost:3000", "http://localhost:3001"];

const ALLOWED_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";

const ALLOWED_HEADERS = [
    "Content-Type",
    "Authorization",
    "x-role",
    "x-locale",
    ...Object.values(AUTH_REQUEST_HEADER),
].join(", ");

const PREFLIGHT_MAX_AGE_SECONDS = "86400";

export function parseAllowedOrigins(raw: string | undefined): string[] {
    return (raw ?? "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);
}

export function resolveAllowedOrigins(
    raw: string | undefined,
    isProduction: boolean
): string[] {
    const configured = parseAllowedOrigins(raw);

    if (configured.length > 0) {
        return configured;
    }

    return isProduction ? [] : DEVELOPMENT_ORIGINS;
}

/**
 * A request without an `Origin` header did not come from a browser page — it is a
 * server calling this server, and CORS has nothing to say about it. Authorization
 * still runs: this decides who may read the answer, not who may ask.
 */
export function isOriginAllowed(
    origin: string | null,
    allowedOrigins: string[]
): boolean {
    return origin === null || allowedOrigins.includes(origin);
}

/**
 * Browsers hide every response header from cross-origin scripts except a short
 * safelist, and `Retry-After` is not on it: without naming it here the wait sent
 * with a `429` reaches the network tab but never the code that would honour it.
 */
const EXPOSED_HEADERS = "Retry-After";

/**
 * `Access-Control-Allow-Origin` holds a single origin, so the validated member of
 * the allowlist is echoed back. `Vary` is announced even when there is no origin
 * to answer, so a shared cache never replays an origin-less response — which
 * carries no permission header — to a browser that did send one.
 */
export function buildCorsHeaders(
    origin: string | null
): Record<string, string> {
    if (!origin) {
        return { Vary: "Origin" };
    }

    return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": ALLOWED_METHODS,
        "Access-Control-Allow-Headers": ALLOWED_HEADERS,
        "Access-Control-Expose-Headers": EXPOSED_HEADERS,
        "Access-Control-Max-Age": PREFLIGHT_MAX_AGE_SECONDS,
        Vary: "Origin",
    };
}
