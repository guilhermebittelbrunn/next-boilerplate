import { getIdTokenSession, getSessionFromCookie } from "@repo/auth/server";
import { SESSION_COOKIE_NAME } from "@repo/auth/session";
import type { DecodedIdToken, UserRecord } from "firebase-admin/auth";
import type { NextRequest } from "next/server";
import { bearerFrom, sessionKeyFromClaims } from "./session-key";
import { trackSession } from "./session-tracker";

type FirebaseCredential = { user: UserRecord; claims: DecodedIdToken };

export type ApiCredential =
    | { status: "active"; user: UserRecord; sessionKey: string | null }
    | { status: "revoked" }
    | { status: "anonymous" };

function asCredential(
    session: { user: UserRecord; decoded: DecodedIdToken } | null
): FirebaseCredential | null {
    return session ? { user: session.user, claims: session.decoded } : null;
}

/**
 * Accepts both credential transports used in this monorepo:
 * - `Authorization: Bearer <idToken>` (client SDK) → verifyIdToken (fast path).
 * - The shared `access-token` session cookie (SSR / cross-app) → verifySessionCookie.
 *
 * SSR forwards the session cookie as a bearer, so we also try verifying a bearer
 * value as a session cookie when it is not a valid ID token.
 */
async function resolveFirebaseCredential(
    req: NextRequest
): Promise<FirebaseCredential | null> {
    const bearer = bearerFrom(req);

    if (bearer) {
        const viaIdToken = await getIdTokenSession(bearer);
        if (viaIdToken) {
            return asCredential(viaIdToken);
        }
        const viaSessionBearer = await getSessionFromCookie(bearer);
        if (viaSessionBearer) {
            return asCredential(viaSessionBearer);
        }
    }

    const cookieToken = req.cookies.get(SESSION_COOKIE_NAME)?.value ?? null;
    if (cookieToken && cookieToken !== bearer) {
        return asCredential(await getSessionFromCookie(cookieToken));
    }

    return null;
}

/**
 * Firebase only revokes every session of an account at once, so ending one session is
 * refused here, against the session records, for both transports.
 */
export async function resolveApiCredential(
    req: NextRequest
): Promise<ApiCredential> {
    const credential = await resolveFirebaseCredential(req);
    if (!credential) {
        return { status: "anonymous" };
    }

    const sessionKey = sessionKeyFromClaims(credential.claims);
    if (sessionKey === null) {
        return { status: "active", user: credential.user, sessionKey };
    }

    const standing = await trackSession({
        uid: credential.user.uid,
        sessionKey,
        userAgent: req.headers.get("user-agent"),
    });

    return standing === "revoked"
        ? { status: "revoked" }
        : { status: "active", user: credential.user, sessionKey };
}

/** The authenticated Firebase user for an API request, or null — an ended session included. */
export async function resolveApiActor(
    req: NextRequest
): Promise<UserRecord | null> {
    const credential = await resolveApiCredential(req);
    return credential.status === "active" ? credential.user : null;
}
