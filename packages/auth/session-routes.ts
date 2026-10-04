import "server-only";
import { HTTP_STATUS } from "@repo/shared/utils";
import {
    createCustomToken,
    decodeSessionCookie,
    getSessionFromCookie,
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
import type { SessionAuthority } from "./types";

const SESSION_REVOKED_CODE = "AUTH_SESSION_REVOKED";

/**
 * Generic auth session route handlers shared by every front-end (web + app).
 * Each app re-exports these from its own `app/api/auth/.../route.ts` so the
 * cross-app session logic lives in one place ("genérico no pacote").
 *
 * The optional `SessionAuthority` is the API: only it knows that a session was ended
 * from another device. Without it, the cookie is written on Firebase's word alone.
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

/**
 * Only an explicit refusal stops the write. An API that does not answer leaves the
 * decision to Firebase, which still verifies the credential while minting, and the API
 * refuses the credential itself once it is back.
 */
async function refuseRevokedSession(
    authority: SessionAuthority | undefined,
    credential: string,
    request: Request | undefined
): Promise<Response | null> {
    if (!authority) {
        return null;
    }
    const standing = await authority.check(
        credential,
        request?.headers.get("user-agent") ?? null
    );
    if (standing !== "revoked") {
        return null;
    }
    await clearSessionCookie();
    return jsonError(SESSION_REVOKED_CODE, HTTP_STATUS.UNAUTHORIZED);
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
export async function sessionPOST(
    request: Request,
    authority?: SessionAuthority
): Promise<Response> {
    if (!isSameOriginRequest(request)) {
        return jsonError("AUTH_FORBIDDEN_ORIGIN", HTTP_STATUS.FORBIDDEN);
    }

    const idToken = await readIdToken(request);
    if (!idToken) {
        return jsonError("AUTH_MISSING_TOKEN", HTTP_STATUS.BAD_REQUEST);
    }

    const revoked = await refuseRevokedSession(authority, idToken, request);
    if (revoked) {
        return revoked;
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
export async function sessionRefreshPOST(
    request: Request,
    authority?: SessionAuthority
): Promise<Response> {
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

    const revoked = await refuseRevokedSession(authority, current, request);
    if (revoked) {
        return revoked;
    }

    const minted = await mintSessionCookie(idToken);
    if (!minted.ok) {
        return await mintFailureResponse(minted);
    }

    return Response.json({ refreshed: true });
}

/**
 * DELETE /api/auth/session — sign out this browser, leaving the account's other sessions
 * alive. The API records the session as ended, which is what stops the other front-end
 * open in this browser from writing the cookie back.
 */
export async function sessionDELETE(
    authority?: SessionAuthority
): Promise<Response> {
    const current = await readSessionCookie();
    if (current && authority) {
        await authority.end(current).catch(() => null);
    }
    await clearSessionCookie();
    return Response.json({ ok: true });
}

/**
 * POST /api/auth/custom-token — cross-app SSO bootstrap: verify the shared session
 * cookie and return a custom token so this origin's client SDK can sign in and
 * emit ID tokens. Returns 401 when there is no valid shared session.
 */
export async function customTokenPOST(
    request?: Request,
    authority?: SessionAuthority
): Promise<Response> {
    const sessionCookie = await readSessionCookie();
    const session = await getSessionFromCookie(sessionCookie);
    if (!(session && sessionCookie)) {
        return jsonError("AUTH_NO_SESSION", HTTP_STATUS.UNAUTHORIZED);
    }

    const originSeconds = resolveSessionOriginSeconds(session.decoded);
    if (!isWithinAbsoluteCap(originSeconds)) {
        await clearSessionCookie();
        return jsonError("AUTH_SESSION_EXPIRED", HTTP_STATUS.UNAUTHORIZED);
    }

    const revoked = await refuseRevokedSession(
        authority,
        sessionCookie,
        request
    );
    if (revoked) {
        return revoked;
    }

    const token = await createCustomToken(
        session.user.uid,
        originSeconds === null
            ? undefined
            : { [SESSION_ORIGIN_CLAIM]: originSeconds }
    );
    return Response.json({ token });
}
