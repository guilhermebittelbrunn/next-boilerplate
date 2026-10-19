import type { globalTranslations } from "@repo/internationalization/translations/global";
import {
    CONTACT_MESSAGE_MAX_LENGTH,
    CONTACT_NAME_MAX_LENGTH,
} from "@repo/shared/utils/helpers/contactMessage";
import { z } from "zod";

type Dictionary = (typeof globalTranslations)[keyof typeof globalTranslations];

const EMAIL_MAX = 320;

export function buildContactFormSchema(dictionary: Dictionary) {
    const validation = dictionary.apps.web.pages.contact.validation;

    return z.object({
        name: z
            .string()
            .trim()
            .min(1, validation.nameRequired)
            .max(CONTACT_NAME_MAX_LENGTH, validation.nameTooLong),
        email: z
            .string()
            .trim()
            .max(EMAIL_MAX, validation.emailInvalid)
            .email(validation.emailInvalid),
        message: z
            .string()
            .trim()
            .min(1, validation.messageRequired)
            .max(CONTACT_MESSAGE_MAX_LENGTH, validation.messageTooLong),
    });
}

export type ContactFormValues = z.infer<
    ReturnType<typeof buildContactFormSchema>
>;
