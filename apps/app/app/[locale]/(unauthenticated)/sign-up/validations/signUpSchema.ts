import type { globalTranslations } from "@repo/internationalization/translations/global";
import { z } from "zod";

type Dictionary = (typeof globalTranslations)[keyof typeof globalTranslations];

const MIN_PASSWORD_LENGTH = 6;

export function buildSignUpSchema(dictionary: Dictionary) {
    const validation = dictionary.apps.app.pages.signUp.validation;

    return z
        .object({
            email: z.string().email(validation.emailInvalid),
            password: z
                .string()
                .min(MIN_PASSWORD_LENGTH, validation.passwordMin),
            confirmPassword: z
                .string()
                .min(MIN_PASSWORD_LENGTH, validation.passwordMin),
        })
        .refine((data) => data.password === data.confirmPassword, {
            message: validation.passwordsDoNotMatch,
            path: ["confirmPassword"],
        });
}

export type SignUpFormValues = z.infer<ReturnType<typeof buildSignUpSchema>>;
