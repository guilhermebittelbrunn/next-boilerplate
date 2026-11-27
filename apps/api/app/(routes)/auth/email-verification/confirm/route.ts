import { AuditAction } from "@repo/sdk/src/types";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { logEvent } from "@repo/shared/utils/helpers/log";
import { requestIdFrom } from "@repo/shared/utils/helpers/request-id";
import { recordAccountLifecycleEvent } from "@/(shared)/lib/audit-recorder";
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
import { parseEmailVerificationConfirm } from "@/(shared)/validation/auth.schema";

const EMAIL_VERIFICATION_REQUEST_TYPE = "VERIFY_EMAIL";

function toolkitFailure(error: IdentityToolkitError): Response {
    const code = mapOobActionMessageToCode(
        error.message,
        "AUTH_EMAIL_VERIFICATION_FAILED"
    );
    return Response.json(
        { error: { code } },
        { status: statusForAuthErrorCode(code) }
    );
}

/**
 * The route is public, so the holder comes from the account the provider just verified,
 * never from the request. A holder without a profile is logged and the confirmation
 * still succeeds.
 */
async function recordEmailVerified(
    applied: ToolkitApplyOob,
    requestId: string | null
): Promise<void> {
    const profile = applied.localId
        ? await userRepository
              .findByReferenceId(applied.localId)
              .catch(() => null)
        : null;

    if (!profile) {
        logEvent("audit", "subject-not-found", {
            action: AuditAction.ACCOUNT_EMAIL_VERIFY,
            requestId,
        });
        return;
    }

    await recordAccountLifecycleEvent({
        action: AuditAction.ACCOUNT_EMAIL_VERIFY,
        profileId: profile.id,
        uid: applied.localId,
        label: applied.email || null,
        requestId,
    });
}

export async function POST(req: Request) {
    const parsedBody = await parseRequestJson(req);
    if (!parsedBody.ok) {
        return parsedBody.response;
    }

    const parsed = parseEmailVerificationConfirm(parsedBody.value);
    if (!parsed.ok) {
        return parsed.response;
    }

    const { oobCode } = parsed.value;
    let applied: ToolkitApplyOob;
    try {
        const checked = await identityCheckOobCode(oobCode);
        // Applying an email-change code here would move the address without revoking
        // the account's sessions or reaching the trail, so only verification codes pass.
        if (checked.requestType !== EMAIL_VERIFICATION_REQUEST_TYPE) {
            return Response.json(
                { error: { code: "AUTH_OOB_CODE_INVALID" } },
                { status: HTTP_STATUS.BAD_REQUEST }
            );
        }
        applied = await identityApplyOobCode(oobCode);
    } catch (error) {
        if (error instanceof IdentityToolkitError) {
            return toolkitFailure(error);
        }
        throw error;
    }

    await recordEmailVerified(applied, requestIdFrom(req));

    return Response.json({ data: { confirmed: true } });
}
