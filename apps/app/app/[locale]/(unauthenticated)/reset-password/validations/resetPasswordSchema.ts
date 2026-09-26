import type { globalTranslations } from "@repo/internationalization/translations/global";
import { PASSWORD_MIN_LENGTH } from "@repo/shared/utils/helpers/passwordPolicy";
import { z } from "zod";

type Dictionary = (typeof globalTranslations)[keyof typeof globalTranslations];

export function buildResetPasswordSchema(dictionary: Dictionary) {
    const validation = dictionary.apps.app.pages.resetPassword.validation;

    return z
        .object({
            password: z
                .string()
                .min(PASSWORD_MIN_LENGTH, validation.passwordMin),
            confirmPassword: z
                .string()
                .min(PASSWORD_MIN_LENGTH, validation.passwordMin),
        })
        .refine((data) => data.password === data.confirmPassword, {
            message: validation.passwordsDoNotMatch,
            path: ["confirmPassword"],
        });
}

export type ResetPasswordFormValues = z.infer<
    ReturnType<typeof buildResetPasswordSchema>
>;
