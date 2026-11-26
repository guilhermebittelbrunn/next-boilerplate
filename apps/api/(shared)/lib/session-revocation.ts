import { revokeUserSessionsOrThrow } from "@repo/auth/server";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { logEvent } from "@repo/shared/utils/helpers/log";
import { requestIdFrom } from "@repo/shared/utils/helpers/request-id";
import { adminAuthErrorReason, adminErrorCodeOf } from "./toolkit-error-codes";

/** Ends every session of the account; `false` means some may still be open. */
export async function revokeSessionsOrReport(
    uid: string,
    req: Request
): Promise<boolean> {
    try {
        await revokeUserSessionsOrThrow(uid);
        return true;
    } catch (error) {
        logEvent("auth", "session-revoke-failed", {
            requestId: requestIdFrom(req),
            ...revokeFailureFields(error),
        });
        return false;
    }
}

/** Same fields `@repo/auth` logs for a refused revocation: the provider code or the error name. */
function revokeFailureFields(
    error: unknown
): { code: string } | { reason: string } {
    const code = adminErrorCodeOf(error);
    return code === undefined
        ? { reason: adminAuthErrorReason(error) }
        : { code };
}

/**
 * The change the caller asked for is already saved; only ending the other sessions
 * failed. 500 and not 401: the SDK signs the caller out on every 401.
 */
export function sessionsNotRevokedResponse(
    code = "AUTH_SESSIONS_NOT_REVOKED"
): Response {
    return Response.json(
        { error: { code } },
        { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
}
