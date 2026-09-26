import type { globalTranslations } from "@repo/internationalization/translations/global";
import { EXISTING_PASSWORD_MIN_LENGTH } from "@repo/shared/utils/helpers/passwordPolicy";
import { z } from "zod";

type Dictionary = (typeof globalTranslations)[keyof typeof globalTranslations];

export function buildSignInSchema(dictionary: Dictionary) {
    const validation = dictionary.apps.app.pages.signIn.validation;

    return z.object({
        email: z.string().email(validation.emailInvalid),
        password: z
            .string()
            .min(EXISTING_PASSWORD_MIN_LENGTH, validation.passwordMin),
    });
}

export type SignInFormValues = z.infer<ReturnType<typeof buildSignInSchema>>;
