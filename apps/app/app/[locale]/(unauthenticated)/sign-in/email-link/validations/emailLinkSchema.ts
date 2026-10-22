import type { globalTranslations } from "@repo/internationalization/translations/global";
import { z } from "zod";

type Dictionary = (typeof globalTranslations)[keyof typeof globalTranslations];

export function buildEmailLinkSchema(dictionary: Dictionary) {
    const validation = dictionary.apps.app.pages.emailLinkSignIn.validation;

    return z.object({
        email: z.string().trim().email(validation.emailInvalid),
    });
}

export type EmailLinkFormValues = z.infer<
    ReturnType<typeof buildEmailLinkSchema>
>;
