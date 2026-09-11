import { getAuthInstance, revokeUserSessions } from "@repo/auth/server";
import {
    IdentityToolkitError,
    identityResetPassword,
} from "@/(shared)/lib/firebase-identity-toolkit";
import { parseRequestJson } from "@/(shared)/lib/parse-request-json";
import {
    mapOobActionMessageToCode,
    statusForAuthErrorCode,
} from "@/(shared)/lib/toolkit-error-codes";
import { parsePasswordResetConfirm } from "@/(shared)/validation/auth.schema";

export async function POST(req: Request) {
    const parsedBody = await parseRequestJson(req);
    if (!parsedBody.ok) {
        return parsedBody.response;
    }

    const parsed = parsePasswordResetConfirm(parsedBody.value);
    if (!parsed.ok) {
        return parsed.response;
    }

    let email: string;
    try {
        ({ email } = await identityResetPassword(
            parsed.value.oobCode,
            parsed.value.password
        ));
    } catch (error) {
        if (error instanceof IdentityToolkitError) {
            const code = mapOobActionMessageToCode(
                error.message,
                "AUTH_PASSWORD_RESET_FAILED"
            );
            return Response.json(
                { error: { code } },
                { status: statusForAuthErrorCode(code) }
            );
        }
        throw error;
    }

    // Every open session must stop working: the shared session cookie is verified
    // with the revocation check on, so dropping the refresh tokens invalidates it
    // in every app at the next navigation.
    try {
        const user = await getAuthInstance().getUserByEmail(email);
        await revokeUserSessions(user.uid);
    } catch (error) {
        console.error("Could not revoke sessions after password reset", error);
    }

    return Response.json({ data: { confirmed: true } });
}
