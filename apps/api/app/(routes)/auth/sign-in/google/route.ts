import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import {
    IdentityToolkitError,
    identitySignInWithGoogleIdToken,
} from "@/(shared)/lib/firebase-identity-toolkit";
import { parseRequestJson } from "@/(shared)/lib/parse-request-json";
import {
    mapPasswordCheckMessageToCode,
    statusForAuthErrorCode,
} from "@/(shared)/lib/toolkit-error-codes";
import { getMergedUserByUid } from "@/(shared)/lib/user-merge";
import { parseGoogleSignIn } from "@/(shared)/validation/auth.schema";

const DEFAULT_REQUEST_URI = "http://localhost:3000";

export async function POST(req: Request) {
    const parsedBody = await parseRequestJson(req);
    if (!parsedBody.ok) {
        return parsedBody.response;
    }

    const parsed = parseGoogleSignIn(parsedBody.value);
    if (!parsed.ok) {
        return parsed.response;
    }

    let session: Awaited<ReturnType<typeof identitySignInWithGoogleIdToken>>;
    try {
        session = await identitySignInWithGoogleIdToken(
            parsed.value.idToken,
            parsed.value.requestUri ?? DEFAULT_REQUEST_URI
        );
    } catch (error) {
        if (!(error instanceof IdentityToolkitError)) {
            throw error;
        }
        const code = mapPasswordCheckMessageToCode(
            error.message,
            "AUTH_INVALID_CREDENTIALS"
        );
        return Response.json(
            { error: { code } },
            { status: statusForAuthErrorCode(code) }
        );
    }

    const user = await getMergedUserByUid(session.localId);

    if (!user) {
        return Response.json(
            { error: { code: "USERS_NOT_FOUND" } },
            { status: HTTP_STATUS.NOT_FOUND }
        );
    }

    return Response.json({
        session: {
            idToken: session.idToken,
            refreshToken: session.refreshToken,
            expiresIn: session.expiresIn,
        },
        user,
    });
}
