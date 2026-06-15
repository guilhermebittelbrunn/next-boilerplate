import "server-only";
import {
    createCustomToken,
    getUserFromSessionCookie,
    revokeUserSessions,
} from "./server";
import {
    clearSessionCookie,
    isSameOriginRequest,
    mintSessionCookie,
    readSessionCookie,
} from "./session";

/**
 * Generic auth session route handlers shared by every front-end (web + app).
 * Each app re-exports these from its own `app/api/auth/.../route.ts` so the
 * cross-app session logic lives in one place ("genérico no pacote").
 */

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

/** POST /api/auth/session — exchange a Firebase ID token for the shared session cookie. */
export async function sessionPOST(request: Request): Promise<Response> {
    if (!isSameOriginRequest(request)) {
        return Response.json(
            { error: { code: "AUTH_FORBIDDEN_ORIGIN" } },
            { status: 403 }
        );
    }

    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return Response.json(
            { error: { code: "AUTH_MISSING_TOKEN" } },
            { status: 400 }
        );
    }

    const idToken = extractIdToken(body);
    if (!idToken) {
        return Response.json(
            { error: { code: "AUTH_MISSING_TOKEN" } },
            { status: 400 }
        );
    }

    try {
        await mintSessionCookie(idToken);
    } catch {
        // Invalid/expired ID token (createSessionCookie rejects it).
        return Response.json(
            { error: { code: "AUTH_INVALID_TOKEN" } },
            { status: 401 }
        );
    }

    return Response.json({ ok: true });
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
    const user = await getUserFromSessionCookie(sessionCookie);
    if (!user) {
        return Response.json(
            { error: { code: "AUTH_NO_SESSION" } },
            { status: 401 }
        );
    }
    const token = await createCustomToken(user.uid);
    return Response.json({ token });
}
