import { getAuthInstance, revokeUserSessions } from "@repo/auth/server";
import { AuditAction, AuditTargetType } from "@repo/sdk/src/types";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { requestIdFrom } from "@repo/shared/utils/helpers/request-id";
import { recordAuditEvent } from "@/(shared)/lib/audit-recorder";
import { hasPasswordProvider } from "@/(shared)/lib/auth-providers";
import { parseRequestJson } from "@/(shared)/lib/parse-request-json";
import { isRecentGoogleSignIn } from "@/(shared)/lib/recent-google-sign-in";
import { parseSetPassword } from "@/(shared)/validation/account.schema";
import { requireCommonPanelApi } from "@/app/(guards)/common-panel";

function errorResponse(code: string, status: number) {
    return Response.json({ error: { code } }, { status });
}

export const POST = requireCommonPanelApi(async (req, ctx) => {
    if (ctx.subjectProfile.reference_id !== ctx.user.uid) {
        return errorResponse(
            "AUTH_REQUEST_IMPERSONATION_FORBIDDEN",
            HTTP_STATUS.FORBIDDEN
        );
    }

    const parsedBody = await parseRequestJson(req);
    if (!parsedBody.ok) {
        return parsedBody.response;
    }

    const parsed = parseSetPassword(parsedBody.value);
    if (!parsed.ok) {
        return parsed.response;
    }

    // Firebase clears the account's address when a password is unlinked, and without an
    // address it stores the new password without adding it as a sign-in method.
    const email =
        ctx.user.email ||
        ctx.user.providerData.find((provider) => provider.email)?.email;
    if (!email) {
        return errorResponse(
            "ACCOUNT_PASSWORD_UNSUPPORTED",
            HTTP_STATUS.BAD_REQUEST
        );
    }

    if (hasPasswordProvider(ctx.user)) {
        return errorResponse(
            "ACCOUNT_PASSWORD_ALREADY_SET",
            HTTP_STATUS.CONFLICT
        );
    }

    // 400 and not 401: the SDK ends the session on every 401, and a refused proof is no
    // reason to sign the caller out.
    if (
        !(await isRecentGoogleSignIn(parsed.value.reauthIdToken, ctx.user.uid))
    ) {
        return errorResponse("ACCOUNT_REAUTH_INVALID", HTTP_STATUS.BAD_REQUEST);
    }

    try {
        await getAuthInstance().updateUser(ctx.user.uid, {
            email,
            password: parsed.value.password,
        });
    } catch {
        return errorResponse(
            "ACCOUNT_UPDATE_FAILED",
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }

    // A new credential ends every session, the caller's included, as a password change does.
    await revokeUserSessions(ctx.user.uid);

    await recordAuditEvent({
        action: AuditAction.ACCOUNT_PASSWORD_SET,
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
