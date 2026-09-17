import "server-only";
import { HTTP_STATUS } from "@repo/shared/utils";
import {
    createCustomToken,
    decodeSessionCookie,
    getSessionFromCookie,
    getUserFromSessionCookie,
    revokeUserSessions,
} from "./server";
import {
    clearSessionCookie,
    isSameOriginRequest,
    isWithinAbsoluteCap,
    type MintSessionResult,
    mintSessionCookie,
    readSessionCookie,
    resolveSessionOriginSeconds,
    SESSION_ORIGIN_CLAIM,
    shouldRefreshSession,
} from "./session";

/**
 * Generic auth session route handlers shared by every front-end (web + app).
 * Each app re-exports these from its own `app/api/auth/.../route.ts` so the
 * cross-app session logic lives in one place ("genérico no pacote").
 */

function jsonError(code: string, status: number): Response {
    return Response.json({ error: { code } }, { status });
}

function extractIdToken(body: unknown): string | null {
    if (
        typeof body === "object" &&
        body !== null &&
        "idToken" in body &&
        typeof (body as { idToken: unknown }).idToken === "string"
    ) {
        return (body as { idToken: string }).idToken;
    }
    return null;
}

async function readIdToken(request: Request): Promise<string | null> {
    try {
        return extractIdToken(await request.json());
    } catch {
        return null;
    }
}

async function mintFailureResponse(
    minted: Extract<MintSessionResult, { ok: false }>
): Promise<Response> {
    if (minted.reason === "absolute-cap") {
        await clearSessionCookie();
        return jsonError("AUTH_SESSION_EXPIRED", HTTP_STATUS.UNAUTHORIZED);
    }
    return jsonError("AUTH_INVALID_TOKEN", HTTP_STATUS.UNAUTHORIZED);
}

/** POST /api/auth/session — exchange a Firebase ID token for the shared session cookie. */
export async function sessionPOST(request: Request): Promise<Response> {
    if (!isSameOriginRequest(request)) {
        return jsonError("AUTH_FORBIDDEN_ORIGIN", HTTP_STATUS.FORBIDDEN);
    }

    const idToken = await readIdToken(request);
    if (!idToken) {
        return jsonError("AUTH_MISSING_TOKEN", HTTP_STATUS.BAD_REQUEST);
    }

    const minted = await mintSessionCookie(idToken);
    if (!minted.ok) {
        return await mintFailureResponse(minted);
    }

    return Response.json({ ok: true });
}

/**
 * POST /api/auth/session/refresh — slide the session forward from a still-valid
 * cookie. Ordered so that the hot path (a cookie minted moments ago) costs local
 * cryptography and nothing else: that ordering is also what keeps the route from
 * being worth hammering.
 */
export async function sessionRefreshPOST(request: Request): Promise<Response> {
    if (!isSameOriginRequest(request)) {
        return jsonError("AUTH_FORBIDDEN_ORIGIN", HTTP_STATUS.FORBIDDEN);
    }

    const idToken = await readIdToken(request);
    if (!idToken) {
        return jsonError("AUTH_MISSING_TOKEN", HTTP_STATUS.BAD_REQUEST);
    }

    const current = await readSessionCookie();
    if (!current) {
        return jsonError("AUTH_NO_SESSION", HTTP_STATUS.UNAUTHORIZED);
    }

    const claims = await decodeSessionCookie(current);
    if (!claims) {
        await clearSessionCookie();
        return jsonError("AUTH_NO_SESSION", HTTP_STATUS.UNAUTHORIZED);
    }

    if (!shouldRefreshSession(claims.iat)) {
        return Response.json({ refreshed: false });
    }

    if (!(await getSessionFromCookie(current))) {
        await clearSessionCookie();
        return jsonError("AUTH_NO_SESSION", HTTP_STATUS.UNAUTHORIZED);
    }

    const minted = await mintSessionCookie(idToken);
    if (!minted.ok) {
        return await mintFailureResponse(minted);
    }

    return Response.json({ refreshed: true });
}

/** DELETE /api/auth/session — sign out everywhere (revoke + clear the shared cookie). */
export async function sessionDELETE(): Promise<Response> {
    const current = await readSessionCookie();
    if (current) {
        const user = await getUserFromSessionCookie(current);
        if (user) {
            // Other origins' ID-token refresh then fails too (cross-app sign-out).
            await revokeUserSessions(user.uid);
        }
    }
    await clearSessionCookie();
    return Response.json({ ok: true });
}

/**
 * POST /api/auth/custom-token — cross-app SSO bootstrap: verify the shared session
 * cookie and return a custom token so this origin's client SDK can sign in and
 * emit ID tokens. Returns 401 when there is no valid shared session.
 */
export async function customTokenPOST(): Promise<Response> {
    const sessionCookie = await readSessionCookie();
    const session = await getSessionFromCookie(sessionCookie);
    if (!session) {
        return jsonError("AUTH_NO_SESSION", HTTP_STATUS.UNAUTHORIZED);
    }

    const originSeconds = resolveSessionOriginSeconds(session.decoded);
    if (!isWithinAbsoluteCap(originSeconds)) {
        await clearSessionCookie();
        return jsonError("AUTH_SESSION_EXPIRED", HTTP_STATUS.UNAUTHORIZED);
    }

    const token = await createCustomToken(
        session.user.uid,
        originSeconds === null
            ? undefined
            : { [SESSION_ORIGIN_CLAIM]: originSeconds }
    );
    return Response.json({ token });
}
