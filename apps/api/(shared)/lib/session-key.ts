import { decodeSessionCookie, verifyIdTokenClaims } from "@repo/auth/server";
import {
    resolveSessionOriginSeconds,
    SESSION_COOKIE_NAME,
} from "@repo/auth/session";
import type { NextRequest } from "next/server";

/**
 * A session is named after the instant of the sign-in that started it. Every ID token of
 * a Firebase session carries the same `auth_time`, the session cookie inherits it, and the
 * front-end that signs in through the cross-app bootstrap inherits it through a claim.
 */
export function sessionKeyFromClaims(
    claims: Record<string, unknown>
): string | null {
    const seconds = resolveSessionOriginSeconds(claims);
    return seconds === null ? null : String(Math.trunc(seconds));
}

/** Firebase accepts `/` in a uid and Firestore refuses it in a document id. */
export function sessionDocId(uid: string, sessionKey: string): string {
    return `${encodeURIComponent(uid)}_${sessionKey}`;
}

export function bearerFrom(req: NextRequest): string | null {
    const authHeader = req.headers.get("authorization");
    return authHeader?.startsWith("Bearer ")
        ? authHeader.slice("Bearer ".length).trim()
        : null;
}

/**
 * Decodes only, with local cryptography: the guard in front of the route has already
 * verified the credential with Firebase and refused an ended session.
 */
export async function resolveRequestSessionKey(
    req: NextRequest
): Promise<string | null> {
    const bearer = bearerFrom(req);
    if (bearer) {
        const claims =
            (await verifyIdTokenClaims(bearer)) ??
            (await decodeSessionCookie(bearer));
        if (claims) {
            return sessionKeyFromClaims(claims);
        }
    }

    const cookieToken = req.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;
    if (cookieToken && cookieToken !== bearer) {
        const claims = await decodeSessionCookie(cookieToken);
        return claims ? sessionKeyFromClaims(claims) : null;
    }

    return null;
}
