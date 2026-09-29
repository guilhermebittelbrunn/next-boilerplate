import { revokeUserSessions } from "@repo/auth/server";
import { AuditAction, AuditTargetType } from "@repo/sdk/src/types";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { logEvent } from "@repo/shared/utils/helpers/log";
import { requestIdFrom } from "@repo/shared/utils/helpers/request-id";
import { recordAuditEvent } from "@/(shared)/lib/audit-recorder";
import {
    IdentityToolkitError,
    identityApplyOobCode,
    identityCheckOobCode,
    type ToolkitApplyOob,
} from "@/(shared)/lib/firebase-identity-toolkit";
import { parseRequestJson } from "@/(shared)/lib/parse-request-json";
import {
    mapOobActionMessageToCode,
    statusForAuthErrorCode,
} from "@/(shared)/lib/toolkit-error-codes";
import { userRepository } from "@/(shared)/repositories/user.repository";
import { parseEmailChangeConfirm } from "@/(shared)/validation/auth.schema";

const EMAIL_CHANGE_REQUEST_TYPE = "VERIFY_AND_CHANGE_EMAIL";

function toolkitFailure(error: IdentityToolkitError): Response {
    const code = mapOobActionMessageToCode(
        error.message,
        "AUTH_EMAIL_CHANGE_FAILED"
    );
    return Response.json(
        { error: { code } },
        { status: statusForAuthErrorCode(code) }
    );
}

export async function POST(req: Request) {
    const parsedBody = await parseRequestJson(req);
    if (!parsedBody.ok) {
        return parsedBody.response;
    }

    const parsed = parseEmailChangeConfirm(parsedBody.value);
    if (!parsed.ok) {
        return parsed.response;
    }

    const { oobCode } = parsed.value;
    let previousEmail: string | null;
    try {
        const checked = await identityCheckOobCode(oobCode);
        // A verification or password-reset code would be spent by the apply below
        // without revoking anything or reaching the trail, so it never gets that far.
        if (checked.requestType !== EMAIL_CHANGE_REQUEST_TYPE) {
            return Response.json(
                { error: { code: "AUTH_OOB_CODE_INVALID" } },
                { status: HTTP_STATUS.BAD_REQUEST }
            );
        }
        previousEmail = checked.email ?? null;
    } catch (error) {
        if (error instanceof IdentityToolkitError) {
            return toolkitFailure(error);
        }
        throw error;
    }

    let applied: ToolkitApplyOob;
    try {
        applied = await identityApplyOobCode(oobCode);
    } catch (error) {
        if (error instanceof IdentityToolkitError) {
            return toolkitFailure(error);
        }
        throw error;
    }

    // The provider has already moved the address, so from here on nothing is reported as
    // a failure to whoever opened the link. Applying the code does not revoke the
    // account's sessions on its own, and a session opened before the change must not
    // outlive it.
    await revokeUserSessions(applied.localId);

    const requestId = requestIdFrom(req);
    const profile = await userRepository
        .findByReferenceId(applied.localId)
        .catch(() => null);

    if (!profile) {
        logEvent("account", "email-change-audit-skipped", { requestId });
        return Response.json({ data: { confirmed: true } });
    }

    await recordAuditEvent({
        action: AuditAction.ACCOUNT_EMAIL_CHANGE,
        actorUserId: profile.id,
        actorUid: applied.localId,
        actorLabel: previousEmail,
        targetType: AuditTargetType.ACCOUNT,
        targetUserId: profile.id,
        targetLabel: applied.email ?? null,
        changedFields: ["email"],
        requestId,
    });

    return Response.json({ data: { confirmed: true } });
}
