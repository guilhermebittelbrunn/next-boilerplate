import type { NextRequest } from "next/server";

export const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const SESSION_COOKIE_NAME = "access-token";

/**
 * A browser attaches the session cookie on its own, so a write carried by it alone must
 * prove where it came from. Every supported browser sends `Origin` on these methods; a
 * bearer token cannot be attached by another site, and server callers use one.
 */
export function isUnprovenCookieWrite(request: NextRequest): boolean {
    return (
        MUTATING_METHODS.has(request.method) &&
        request.headers.get("origin") === null &&
        request.headers.get("sec-fetch-site") !== "same-origin" &&
        !request.headers.has("authorization") &&
        request.cookies.has(SESSION_COOKIE_NAME)
    );
}
