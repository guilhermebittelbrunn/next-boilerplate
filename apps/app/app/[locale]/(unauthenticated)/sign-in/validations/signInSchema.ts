import type { globalTranslations } from "@repo/internationalization/translations/global";
import { z } from "zod";

type Dictionary = (typeof globalTranslations)[keyof typeof globalTranslations];

const MIN_PASSWORD_LENGTH = 6;

export function buildSignInSchema(dictionary: Dictionary) {
    const validation = dictionary.apps.app.pages.signIn.validation;

    return z.object({
        email: z.string().email(validation.emailInvalid),
        password: z.string().min(MIN_PASSWORD_LENGTH, validation.passwordMin),
    });
}

export type SignInFormValues = z.infer<ReturnType<typeof buildSignInSchema>>;
