import { getAuthInstance, revokeUserSessions } from "@repo/auth/server";
import { AuditAction, AuditTargetType } from "@repo/sdk/src/types";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { requestIdFrom } from "@repo/shared/utils/helpers/request-id";
import { recordAuditEvent } from "@/(shared)/lib/audit-recorder";
import {
    IdentityToolkitError,
    identitySignInWithPassword,
} from "@/(shared)/lib/firebase-identity-toolkit";
import { parseRequestJson } from "@/(shared)/lib/parse-request-json";
import {
    mapPasswordCheckMessageToCode,
    statusForAuthErrorCode,
} from "@/(shared)/lib/toolkit-error-codes";
import { parseChangePassword } from "@/(shared)/validation/account.schema";
import { requireCommonPanelApi } from "@/app/(guards)/common-panel";

export const POST = requireCommonPanelApi(async (req, ctx) => {
    const parsedBody = await parseRequestJson(req);
    if (!parsedBody.ok) {
        return parsedBody.response;
    }

    const parsed = parseChangePassword(parsedBody.value);
    if (!parsed.ok) {
        return parsed.response;
    }

    const email = ctx.user.email;
    if (!email) {
        return Response.json(
            { error: { code: "ACCOUNT_PASSWORD_UNSUPPORTED" } },
            { status: HTTP_STATUS.BAD_REQUEST }
        );
    }

    try {
        await identitySignInWithPassword(email, parsed.value.currentPassword);
    } catch (error) {
        if (error instanceof IdentityToolkitError) {
            const code = mapPasswordCheckMessageToCode(
                error.message,
                "ACCOUNT_CURRENT_PASSWORD_INVALID"
            );
            return Response.json(
                { error: { code } },
                { status: statusForAuthErrorCode(code) }
            );
        }
        throw error;
    }

    try {
        await getAuthInstance().updateUser(ctx.user.uid, {
            password: parsed.value.password,
        });
    } catch {
        return Response.json(
            { error: { code: "ACCOUNT_UPDATE_FAILED" } },
            { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
        );
    }

    // Every session of this account is dropped, including the caller's: Firebase cannot
    // revoke selectively, and leaving a stolen session alive would defeat the change.
    await revokeUserSessions(ctx.user.uid);

    await recordAuditEvent({
        action: AuditAction.ACCOUNT_PASSWORD_CHANGE,
        actorUserId: ctx.subjectProfile.id,
        actorUid: ctx.user.uid,
        actorLabel: email,
        targetType: AuditTargetType.ACCOUNT,
        targetUserId: ctx.subjectProfile.id,
        targetLabel: email,
        requestId: requestIdFrom(req),
    });

    return Response.json({ data: { confirmed: true } });
});
