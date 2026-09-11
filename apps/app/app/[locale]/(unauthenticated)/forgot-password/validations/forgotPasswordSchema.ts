import type { globalTranslations } from "@repo/internationalization/translations/global";
import { z } from "zod";

type Dictionary = (typeof globalTranslations)[keyof typeof globalTranslations];

export function buildForgotPasswordSchema(dictionary: Dictionary) {
    const validation = dictionary.apps.app.pages.forgotPassword.validation;

    return z.object({
        email: z.string().trim().email(validation.emailInvalid),
    });
}

export type ForgotPasswordFormValues = z.infer<
    ReturnType<typeof buildForgotPasswordSchema>
>;
