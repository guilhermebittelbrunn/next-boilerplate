import { sendEmail } from "@repo/email";
import { actionLinkEmail } from "@repo/email/templates/action-link";
import { type Locale, resolveLocale } from "@repo/internationalization/utils";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { logEvent } from "@repo/shared/utils/helpers/log";
import { requestIdFrom } from "@repo/shared/utils/helpers/request-id";
import { after } from "next/server";
import {
    buildAuthActionLink,
    canSendAuthActionLink,
} from "@/(shared)/lib/auth-action-links";
import { isEmailLinkSignInEnabled } from "@/(shared)/lib/email-link-sign-in";
import { parseRequestJson } from "@/(shared)/lib/parse-request-json";
import { parseEmailLinkSignInRequest } from "@/(shared)/validation/auth.schema";

/**
 * Runs after the response is already out, for the same reason as the password reset
 * request: an eligible address costs a lookup, a link generation and a call to the mail
 * provider, an unknown one returns at the first step, and the clock would tell them apart.
 */
function deliverSignInLink(
    email: string,
    locale: Locale,
    requestId: string | null
): void {
    after(async () => {
        try {
            const url = await buildAuthActionLink("sign-in", email, locale);
            if (!url) {
                return;
            }

            await sendEmail({
                template: actionLinkEmail,
                to: email,
                locale,
                data: { name: email, url, action: "confirmAccess" },
            });
        } catch {
            logEvent("auth", "email-link-delivery-failed", { requestId });
        }
    });
}

export async function POST(req: Request) {
    // Both refusals depend on the fork's configuration alone, never on the address, so
    // answering them honestly reveals nothing about any account.
    if (!isEmailLinkSignInEnabled()) {
        return Response.json(
            { error: { code: "AUTH_EMAIL_LINK_DISABLED" } },
            { status: HTTP_STATUS.NOT_FOUND }
        );
    }

    if (!canSendAuthActionLink()) {
        return Response.json(
            { error: { code: "EMAIL_NOT_CONFIGURED" } },
            { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
        );
    }

    const parsedBody = await parseRequestJson(req);
    if (!parsedBody.ok) {
        return parsedBody.response;
    }

    const parsed = parseEmailLinkSignInRequest(parsedBody.value);
    if (!parsed.ok) {
        return parsed.response;
    }

    const { email, locale: requestedLocale } = parsed.value;
    deliverSignInLink(
        email,
        resolveLocale(requestedLocale),
        requestIdFrom(req)
    );

    return Response.json({ data: { requested: true } });
}
