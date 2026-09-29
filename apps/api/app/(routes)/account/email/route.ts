import { sendEmail } from "@repo/email";
import { actionLinkEmail } from "@repo/email/templates/action-link";
import { emailChangeNoticeEmail } from "@repo/email/templates/email-change-notice";
import { resolveLocale } from "@repo/internationalization/utils";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { logEvent } from "@repo/shared/utils/helpers/log";
import { requestIdFrom } from "@repo/shared/utils/helpers/request-id";
import {
    buildEmailChangeLink,
    canSendAuthActionLink,
    type EmailChangeLinkResult,
} from "@/(shared)/lib/auth-action-links";
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
import { parseChangeEmail } from "@/(shared)/validation/account.schema";
import { requireCommonPanelApi } from "@/app/(guards)/common-panel";

const errorResponse = (code: string, status: number): Response =>
    Response.json({ error: { code } }, { status });

const emailSendFailed = (): Response =>
    errorResponse("EMAIL_SEND_FAILED", HTTP_STATUS.SERVICE_UNAVAILABLE);

/**
 * Re-entered rather than trusting how recent the session is: signing in through the
 * shared session cookie rewrites the authentication instant. Answers the refusal, or
 * `null` when the password matches.
 */
async function refuseWrongPassword(
    email: string,
    password: string
): Promise<Response | null> {
    try {
        await identitySignInWithPassword(email, password);
        return null;
    } catch (error) {
        if (error instanceof IdentityToolkitError) {
            const code = mapPasswordCheckMessageToCode(
                error.message,
                "ACCOUNT_CURRENT_PASSWORD_INVALID"
            );
            return errorResponse(code, statusForAuthErrorCode(code));
        }
        throw error;
    }
}

function linkFailureResponse(
    link: Extract<EmailChangeLinkResult, { ok: false }>
): Response {
    return link.reason === "email-in-use"
        ? errorResponse(
              "USERS_AUTH_EMAIL_ALREADY_IN_USE",
              HTTP_STATUS.BAD_REQUEST
          )
        : emailSendFailed();
}

export const POST = requireCommonPanelApi(async (req, ctx) => {
    // The password checked and the address changed below are the actor's, so the actor
    // and the subject have to be the same person.
    if (ctx.subjectProfile.reference_id !== ctx.user.uid) {
        return errorResponse(
            "AUTH_REQUEST_IMPERSONATION_FORBIDDEN",
            HTTP_STATUS.FORBIDDEN
        );
    }

    if (!canSendAuthActionLink()) {
        return errorResponse(
            "EMAIL_NOT_CONFIGURED",
            HTTP_STATUS.SERVICE_UNAVAILABLE
        );
    }

    const parsedBody = await parseRequestJson(req);
    if (!parsedBody.ok) {
        return parsedBody.response;
    }

    const parsed = parseChangeEmail(parsedBody.value);
    if (!parsed.ok) {
        return parsed.response;
    }

    const email = ctx.user.email;
    if (!email) {
        return errorResponse(
            "ACCOUNT_PASSWORD_UNSUPPORTED",
            HTTP_STATUS.BAD_REQUEST
        );
    }

    if (!hasPasswordProvider(ctx.user)) {
        return errorResponse(
            "ACCOUNT_EMAIL_CHANGE_REAUTH_UNSUPPORTED",
            HTTP_STATUS.BAD_REQUEST
        );
    }

    const newEmail = parsed.value.newEmail.toLowerCase();
    if (newEmail === email.toLowerCase()) {
        return errorResponse(
            "ACCOUNT_EMAIL_UNCHANGED",
            HTTP_STATUS.BAD_REQUEST
        );
    }

    const passwordRefusal = await refuseWrongPassword(
        email,
        parsed.value.currentPassword
    );
    if (passwordRefusal) {
        return passwordRefusal;
    }

    const locale = resolveLocale(parsed.value.locale);
    let link: EmailChangeLinkResult;
    try {
        link = await buildEmailChangeLink(email, newEmail, locale);
    } catch {
        logEvent("account", "email-change-link-failed", {
            requestId: requestIdFrom(req),
        });
        return errorResponse(
            "ACCOUNT_UPDATE_FAILED",
            HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
    }

    if (!link.ok) {
        return linkFailureResponse(link);
    }

    const name = ctx.user.displayName ?? email;

    // The notice to the current address is what lets the owner contest a change started
    // from a stolen session, so the link does not go out unless the notice did.
    const notice = await sendEmail({
        template: emailChangeNoticeEmail,
        to: email,
        locale,
        data: { name, newEmail },
    });
    if (!notice.sent) {
        return emailSendFailed();
    }

    const delivered = await sendEmail({
        template: actionLinkEmail,
        to: newEmail,
        locale,
        data: { name, url: link.url, action: "changeEmail" },
    });
    if (!delivered.sent) {
        return emailSendFailed();
    }

    return Response.json({ data: { requested: true } });
});
