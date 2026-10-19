import { isEmailEnabled, sendEmail, supportInbox } from "@repo/email";
import { contactEmail } from "@repo/email/templates/contact";
import { resolveLocale } from "@repo/internationalization/utils";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { parseRequestJson } from "@/(shared)/lib/parse-request-json";
import { parseContactMessage } from "@/(shared)/validation/contact.schema";

const contactUnavailable = () =>
    Response.json(
        { error: { code: "CONTACT_UNAVAILABLE" } },
        { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
    );

export async function POST(req: Request) {
    const inbox = supportInbox();
    if (!(inbox && isEmailEnabled())) {
        return contactUnavailable();
    }

    const parsedBody = await parseRequestJson(req);
    if (!parsedBody.ok) {
        return parsedBody.response;
    }

    const parsed = parseContactMessage(parsedBody.value);
    if (!parsed.ok) {
        return parsed.response;
    }

    const { name, email, message, locale } = parsed.value;
    const result = await sendEmail({
        template: contactEmail,
        to: inbox,
        replyTo: email,
        locale: resolveLocale(locale),
        data: { name, email, message },
    });

    if (result.sent) {
        return Response.json({ data: { sent: true } });
    }

    if (result.reason === "provider-error") {
        return Response.json(
            { error: { code: "EMAIL_SEND_FAILED" } },
            { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
        );
    }

    return contactUnavailable();
}
