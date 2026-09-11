import { sendEmail } from "@repo/email";
import { actionLinkEmail } from "@repo/email/templates/action-link";
import { resolveLocale } from "@repo/internationalization/utils";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import {
    buildAuthActionLink,
    canSendAuthActionLink,
} from "@/(shared)/lib/auth-action-links";
import { parseRequestJson } from "@/(shared)/lib/parse-request-json";
import { resolveApiActor } from "@/(shared)/lib/resolve-api-actor";
import { parseEmailVerificationSend } from "@/(shared)/validation/auth.schema";

export async function POST(req: NextRequest) {
    // The real actor, never the impersonated subject: an admin acting as someone
    // else must not be able to send mail to that person's inbox.
    const actor = await resolveApiActor(req);
    if (!actor) {
        return Response.json(
            { error: { code: "AUTH_INVALID_TOKEN" } },
            { status: HTTP_STATUS.UNAUTHORIZED }
        );
    }

    if (!canSendAuthActionLink()) {
        return Response.json(
            { error: { code: "EMAIL_NOT_CONFIGURED" } },
            { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
        );
    }

    if (!actor.email || actor.emailVerified) {
        return Response.json({ data: { requested: true } });
    }

    const parsedBody = await parseRequestJson(req);
    if (!parsedBody.ok) {
        return parsedBody.response;
    }

    const parsed = parseEmailVerificationSend(parsedBody.value);
    if (!parsed.ok) {
        return parsed.response;
    }

    const locale = resolveLocale(parsed.value.locale);
    const url = await buildAuthActionLink("verify-email", actor.email, locale);

    // The account is the authenticated caller's own, so a missing link here never
    // means a missing account: it means the provider would not mint one right now —
    // it throttles link generation per project. Same event as a delivery failure from
    // where the caller stands, so it gets the same answer: the mail did not go out,
    // wait and retry. Anything worded around the action code would be a dead end,
    // since the only code involved is one this request failed to create.
    if (!url) {
        return Response.json(
            { error: { code: "EMAIL_SEND_FAILED" } },
            { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
        );
    }

    const result = await sendEmail({
        template: actionLinkEmail,
        to: actor.email,
        locale,
        data: {
            name: actor.displayName ?? actor.email,
            url,
            action: "verifyEmail",
        },
    });

    // The caller is authenticated and asking about their own account, so a delivery
    // failure can be reported without telling anyone anything new.
    if (!result.sent) {
        return Response.json(
            { error: { code: "EMAIL_SEND_FAILED" } },
            { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
        );
    }

    return Response.json({ data: { requested: true } });
}
