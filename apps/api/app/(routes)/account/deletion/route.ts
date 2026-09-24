import { AuditAction, AuditTargetType } from "@repo/sdk/src/types";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { requestIdFrom } from "@repo/shared/utils/helpers/request-id";
import { runAccountErasure } from "@/(shared)/lib/account-erasure";
import { recordAuditEvent } from "@/(shared)/lib/audit-recorder";
import { hasPasswordProvider } from "@/(shared)/lib/auth-providers";
import {
    IdentityToolkitError,
    identitySignInWithPassword,
} from "@/(shared)/lib/firebase-identity-toolkit";
import { parseRequestJson } from "@/(shared)/lib/parse-request-json";
import {
    mapPasswordCheckMessageToCode,
    statusForAuthErrorCode,
} from "@/(shared)/lib/toolkit-error-codes";
import { parseDeleteAccount } from "@/(shared)/validation/account.schema";
import { requireCommonPanelApi } from "@/app/(guards)/common-panel";

export const POST = requireCommonPanelApi(async (req, ctx) => {
    // The erasure destroys the subject's records but signs off with the actor's Firebase
    // account, so the two have to be the same person. Nothing reaches here with them
    // apart, and that is the point: this refuses instead of erasing if it ever changes.
    if (ctx.subjectProfile.reference_id !== ctx.user.uid) {
        return Response.json(
            { error: { code: "AUTH_REQUEST_IMPERSONATION_FORBIDDEN" } },
            { status: HTTP_STATUS.FORBIDDEN }
        );
    }

    const parsedBody = await parseRequestJson(req);
    if (!parsedBody.ok) {
        return parsedBody.response;
    }

    const parsed = parseDeleteAccount(parsedBody.value);
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

    if (!hasPasswordProvider(ctx.user)) {
        return Response.json(
            { error: { code: "ACCOUNT_DELETION_REAUTH_UNSUPPORTED" } },
            { status: HTTP_STATUS.BAD_REQUEST }
        );
    }

    // The password is re-entered here rather than trusting how recent the session is:
    // signing in through the shared session cookie rewrites the authentication instant,
    // so a stolen session can present itself as fresh.
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

    const requestId = requestIdFrom(req);
    const report = await runAccountErasure({
        profile: ctx.subjectProfile,
        uid: ctx.user.uid,
        requestId,
    });

    // Billing runs first and a failure there stops the erasure before anything is gone,
    // so the account is still whole and the subject can simply try again.
    const billingFailed = report.some(
        (step) => step.step === "billing" && step.status === "failed"
    );
    if (billingFailed) {
        return Response.json(
            { error: { code: "ACCOUNT_DELETION_BILLING_FAILED" } },
            { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
        );
    }

    const signInWasRevoked = report.some(
        (step) => step.step === "authAccount" && step.status === "done"
    );
    if (!signInWasRevoked) {
        return Response.json(
            { error: { code: "ACCOUNT_DELETION_FAILED" } },
            { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
        );
    }

    // No labels: the sweep above just took the e-mail out of the older events, and
    // writing a new one with it would put it back.
    await recordAuditEvent({
        action: AuditAction.ACCOUNT_DELETE,
        actorUserId: ctx.subjectProfile.id,
        actorUid: ctx.user.uid,
        actorLabel: null,
        targetType: AuditTargetType.ACCOUNT,
        targetUserId: ctx.subjectProfile.id,
        targetLabel: null,
        requestId,
    });

    return Response.json({ data: { confirmed: true } });
});
