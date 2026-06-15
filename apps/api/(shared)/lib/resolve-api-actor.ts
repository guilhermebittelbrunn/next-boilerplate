import { getCurrentUser, getUserFromSessionCookie } from "@repo/auth/server";
import { SESSION_COOKIE_NAME } from "@repo/auth/session";
import type { UserRecord } from "firebase-admin/auth";
import type { NextRequest } from "next/server";

/**
 * Resolve the authenticated Firebase user for an API request, accepting both
 * credential transports used in this monorepo:
 * - `Authorization: Bearer <idToken>` (client SDK) → verifyIdToken (fast path).
 * - The shared `access-token` session cookie (SSR / cross-app) → verifySessionCookie.
 *
 * SSR forwards the session cookie as a bearer, so we also try verifying a bearer
 * value as a session cookie when it is not a valid ID token.
 */
export async function resolveApiActor(
    req: NextRequest
): Promise<UserRecord | null> {
    const authHeader = req.headers.get("authorization");
    const bearer = authHeader?.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length).trim()
        : null;

    if (bearer) {
        const viaIdToken = await getCurrentUser(bearer);
        if (viaIdToken) {
            return viaIdToken;
        }
        const viaSessionBearer = await getUserFromSessionCookie(bearer);
        if (viaSessionBearer) {
            return viaSessionBearer;
        }
    }

    const cookieToken = req.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;
    if (cookieToken && cookieToken !== bearer) {
        return await getUserFromSessionCookie(cookieToken);
    }

    return null;
}
