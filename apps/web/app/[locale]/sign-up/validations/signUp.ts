import type { globalTranslations } from "@repo/internationalization/translations/global";
import { PASSWORD_MIN_LENGTH } from "@repo/shared/utils/helpers/passwordPolicy";
import { z } from "zod";

type Dictionary = (typeof globalTranslations)[keyof typeof globalTranslations];

export function buildSignUpSchema(dictionary: Dictionary) {
    const validation = dictionary.apps.web.pages.signUp.validation;

    return z
        .object({
            email: z.string().email(validation.emailInvalid),
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

export type SignUpFormValues = z.infer<ReturnType<typeof buildSignUpSchema>>;
