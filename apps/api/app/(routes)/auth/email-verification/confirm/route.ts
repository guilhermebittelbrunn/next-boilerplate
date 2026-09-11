import {
    IdentityToolkitError,
    identityApplyOobCode,
} from "@/(shared)/lib/firebase-identity-toolkit";
import { parseRequestJson } from "@/(shared)/lib/parse-request-json";
import {
    mapOobActionMessageToCode,
    statusForAuthErrorCode,
} from "@/(shared)/lib/toolkit-error-codes";
import { parseEmailVerificationConfirm } from "@/(shared)/validation/auth.schema";

export async function POST(req: Request) {
    const parsedBody = await parseRequestJson(req);
    if (!parsedBody.ok) {
        return parsedBody.response;
    }

    const parsed = parseEmailVerificationConfirm(parsedBody.value);
    if (!parsed.ok) {
        return parsed.response;
    }

    try {
        await identityApplyOobCode(parsed.value.oobCode);
    } catch (error) {
        if (error instanceof IdentityToolkitError) {
            const code = mapOobActionMessageToCode(
                error.message,
                "AUTH_EMAIL_VERIFICATION_FAILED"
            );
            return Response.json(
                { error: { code } },
                { status: statusForAuthErrorCode(code) }
            );
        }
        throw error;
    }

    return Response.json({ data: { confirmed: true } });
}
