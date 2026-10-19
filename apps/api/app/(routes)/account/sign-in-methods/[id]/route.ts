import { getAuthInstance, revokeUserSessions } from "@repo/auth/server";
import { AuditAction, AuditTargetType } from "@repo/sdk/src/types";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { requestIdFrom } from "@repo/shared/utils/helpers/request-id";
import { recordAuditEvent } from "@/(shared)/lib/audit-recorder";
import {
    hasProvider,
    PASSWORD_PROVIDER_ID,
} from "@/(shared)/lib/auth-providers";
import {
    type RouteIdParamsContext,
    resolveIdFromContext,
} from "@/(shared)/lib/resolve-route-id";
import { parseSignInMethodId } from "@/(shared)/validation/account.schema";
import { requireCommonPanelApi } from "@/app/(guards)/common-panel";

const NO_CONTENT = 204;

function errorResponse(code: string, status: number) {
    return Response.json({ error: { code } }, { status });
}

/**
 * Runs on the server so that "the last method never goes" holds for any client. Any
 * provider the account lists can be removed, which keeps new providers working here.
 */
export const DELETE = requireCommonPanelApi<RouteIdParamsContext>(
    async (req, ctx) => {
        if (ctx.subjectProfile.reference_id !== ctx.user.uid) {
            return errorResponse(
                "AUTH_REQUEST_IMPERSONATION_FORBIDDEN",
                HTTP_STATUS.FORBIDDEN
            );
        }

        const providerId = parseSignInMethodId(await resolveIdFromContext(ctx));
        if (!(providerId && hasProvider(ctx.user, providerId))) {
            return errorResponse(
                "ACCOUNT_SIGN_IN_METHOD_NOT_FOUND",
                HTTP_STATUS.NOT_FOUND
            );
        }

        if (ctx.user.providerData.length <= 1) {
            return errorResponse(
                "ACCOUNT_SIGN_IN_METHOD_LAST",
                HTTP_STATUS.CONFLICT
            );
        }

        const auth = getAuthInstance();
        try {
            await auth.updateUser(ctx.user.uid, {
                providersToUnlink: [providerId],
            });
        } catch {
            return errorResponse(
                "ACCOUNT_UPDATE_FAILED",
                HTTP_STATUS.INTERNAL_SERVER_ERROR
            );
        }

        const label = ctx.user.email ?? ctx.user.displayName ?? null;
        await recordAuditEvent({
            action: AuditAction.ACCOUNT_SIGN_IN_METHOD_UNLINK,
            actorUserId: ctx.subjectProfile.id,
            actorUid: ctx.user.uid,
            actorLabel: label,
            targetType: AuditTargetType.ACCOUNT,
            targetUserId: ctx.subjectProfile.id,
            targetLabel: label,
            changedFields: [providerId],
            requestId: requestIdFrom(req),
        });

        if (providerId !== PASSWORD_PROVIDER_ID) {
            return new Response(null, { status: NO_CONTENT });
        }

        const email = ctx.user.email;
        if (email) {
            // Unlinking the password also clears the account's address and its verified
            // flag in Firebase. Put them back, or the account loses its e-mail and a
            // password set later never becomes a sign-in method.
            try {
                await auth.updateUser(ctx.user.uid, {
                    email,
                    emailVerified: ctx.user.emailVerified,
                });
            } catch {
                return errorResponse(
                    "ACCOUNT_UPDATE_FAILED",
                    HTTP_STATUS.INTERNAL_SERVER_ERROR
                );
            }
        }

        // Firebase treats the restored address as an e-mail change and revokes every
        // refresh token, so the password unlink always ends every session, this one too.
        await revokeUserSessions(ctx.user.uid);

        return new Response(null, { status: NO_CONTENT });
    }
);
