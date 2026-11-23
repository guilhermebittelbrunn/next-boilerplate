import { revokeUserSessionsOrThrow } from "@repo/auth/server";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { logEvent } from "@repo/shared/utils/helpers/log";
import { requestIdFrom } from "@repo/shared/utils/helpers/request-id";

/** Ends every session of the account; `false` means some may still be open. */
export async function revokeSessionsOrReport(
    uid: string,
    req: Request
): Promise<boolean> {
    try {
        await revokeUserSessionsOrThrow(uid);
        return true;
    } catch {
        logEvent("auth", "session-revoke-failed", {
            requestId: requestIdFrom(req),
        });
        return false;
    }
}

/**
 * The change the caller asked for is already saved; only ending the other sessions
 * failed. 500 and not 401: the SDK signs the caller out on every 401.
 */
export function sessionsNotRevokedResponse(): Response {
    return Response.json(
        { error: { code: "AUTH_SESSIONS_NOT_REVOKED" } },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
}
