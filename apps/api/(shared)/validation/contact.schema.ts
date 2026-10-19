import { locales } from "@repo/internationalization/utils";
import {
    CONTACT_MESSAGE_MAX_LENGTH,
    CONTACT_NAME_MAX_LENGTH,
} from "@repo/shared/utils/helpers/contactMessage";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { z } from "zod";

const EMAIL_MAX = 320;

export const contactMessageSchema = z.object({
    name: z.string().trim().min(1).max(CONTACT_NAME_MAX_LENGTH),
    email: z.string().trim().max(EMAIL_MAX).email(),
    message: z.string().trim().min(1).max(CONTACT_MESSAGE_MAX_LENGTH),
    locale: z.enum(locales).optional(),
});

export type ContactMessageInput = z.infer<typeof contactMessageSchema>;

export function parseContactMessage(
    body: unknown
):
    | { ok: true; value: ContactMessageInput }
    | { ok: false; response: Response } {
    const parsed = contactMessageSchema.safeParse(body);
    if (!parsed.success) {
        return {
            ok: false,
            response: Response.json(
                { error: { code: "VALIDATION_FAILED" } },
                { status: HTTP_STATUS.BAD_REQUEST }
            ),
        };
    }
    return { ok: true, value: parsed.data };
}
