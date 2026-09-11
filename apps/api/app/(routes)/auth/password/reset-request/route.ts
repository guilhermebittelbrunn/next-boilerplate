import { sendEmail } from "@repo/email";
import { actionLinkEmail } from "@repo/email/templates/action-link";
import { type Locale, resolveLocale } from "@repo/internationalization/utils";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { after } from "next/server";
import {
    buildAuthActionLink,
    canSendAuthActionLink,
} from "@/(shared)/lib/auth-action-links";
import { parseRequestJson } from "@/(shared)/lib/parse-request-json";
import { parsePasswordResetRequest } from "@/(shared)/validation/auth.schema";

/**
 * Runs after the response is already out. Nothing it learns may reach the caller:
 * an address with an account costs an account lookup, a link generation and a round
 * trip to the mail provider, while an unknown one returns at the first step — a gap
 * of hundreds of milliseconds that answers the very question the identical response
 * body refuses to answer.
 */
function deliverResetLink(email: string, locale: Locale): void {
    after(async () => {
        try {
            const url = await buildAuthActionLink(
                "reset-password",
                email,
                locale
            );
            if (!url) {
                return;
            }

            await sendEmail({
                template: actionLinkEmail,
                to: email,
                locale,
                data: { name: email, url, action: "resetPassword" },
            });
        } catch (error) {
            // No address in the line: a failure here is not a reason to start
            // retaining personal data in the logs.
            console.error("[auth-reset-request] delivery failed", error);
        }
    });
}

export async function POST(req: Request) {
    // Stays synchronous, and first: this answer is a function of the fork's
    // configuration alone, never of the input, which is precisely why it can be
    // honest without revealing whether the address has an account.
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

    const parsed = parsePasswordResetRequest(parsedBody.value);
    if (!parsed.ok) {
        return parsed.response;
    }

    const { email, locale: requestedLocale } = parsed.value;
    deliverResetLink(email, resolveLocale(requestedLocale));

    return Response.json({ data: { requested: true } });
}
