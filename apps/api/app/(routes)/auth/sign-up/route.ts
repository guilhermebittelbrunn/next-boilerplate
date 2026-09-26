import { getAuthInstance } from "@repo/auth/server";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { logEvent } from "@repo/shared/utils/helpers/log";
import { requestIdFrom } from "@repo/shared/utils/helpers/request-id";
import { parseRequestJson } from "@/(shared)/lib/parse-request-json";
import {
    adminAuthErrorReason,
    mapAdminCreateUserErrorToCode,
    statusForAuthErrorCode,
} from "@/(shared)/lib/toolkit-error-codes";
import { createDefaultUserProfile } from "@/(shared)/lib/user-merge";
import { parseSignUp } from "@/(shared)/validation/auth.schema";

/**
 * The account is created with the Admin SDK instead of the Identity Toolkit REST sign-up:
 * Firebase caps REST account creation at 100 per hour per IP, and every sign-up of the
 * product would leave from this server's address. The caller signs in right after.
 */
export async function POST(req: Request) {
    const parsedBody = await parseRequestJson(req);
    if (!parsedBody.ok) {
        return parsedBody.response;
    }

    const parsed = parseSignUp(parsedBody.value);
    if (!parsed.ok) {
        return parsed.response;
    }

    let uid: string;
    try {
        ({ uid } = await getAuthInstance().createUser({
            email: parsed.value.email,
            password: parsed.value.password,
        }));
    } catch (error) {
        const code = mapAdminCreateUserErrorToCode(error);
        if (code) {
            return Response.json(
                { error: { code } },
                { status: statusForAuthErrorCode(code) }
            );
        }
        logEvent("auth", "sign-up-failed", {
            requestId: requestIdFrom(req),
            reason: adminAuthErrorReason(error),
        });
        return Response.json(
            { error: { code: "USERS_AUTH_SIGN_UP_FAILED" } },
            { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
        );
    }

    try {
        await createDefaultUserProfile(uid);
    } catch {
        const requestId = requestIdFrom(req);
        logEvent("auth", "profile-create-failed", { requestId });
        await getAuthInstance()
            .deleteUser(uid)
            .catch((rollbackError: unknown) =>
                logEvent("auth", "sign-up-rollback-failed", {
                    requestId,
                    reason: adminAuthErrorReason(rollbackError),
                })
            );
        return Response.json(
            { error: { code: "USERS_PROFILE_CREATE_FAILED" } },
            { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
        );
    }

    return Response.json(
        { data: { created: true } },
        { status: HTTP_STATUS.CREATED }
    );
}
