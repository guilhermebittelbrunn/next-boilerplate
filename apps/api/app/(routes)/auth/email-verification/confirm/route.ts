import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import {
    IdentityToolkitError,
    identityApplyOobCode,
    identityCheckOobCode,
} from "@/(shared)/lib/firebase-identity-toolkit";
import { parseRequestJson } from "@/(shared)/lib/parse-request-json";
import {
    mapOobActionMessageToCode,
    statusForAuthErrorCode,
} from "@/(shared)/lib/toolkit-error-codes";
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
        await identityApplyOobCode(oobCode);
    } catch (error) {
        if (error instanceof IdentityToolkitError) {
            return toolkitFailure(error);
        }
        throw error;
    }

    return Response.json({ data: { confirmed: true } });
}
