import type { globalTranslations } from "@repo/internationalization/translations/global";
import { EXISTING_PASSWORD_MIN_LENGTH } from "@repo/shared/utils/helpers/passwordPolicy";
import { z } from "zod";

type Dictionary = (typeof globalTranslations)[keyof typeof globalTranslations];

const EMAIL_MAX = 320;

export type AccountEmailChangeFormValues = {
    newEmail: string;
    currentPassword: string;
};

export function buildAccountEmailChangeSchema(
    dictionary: Dictionary,
    currentEmail: string | null
) {
    const validation =
        dictionary.apps.app.pages.common.account.profile.emailChange.validation;
    const normalizedCurrent = currentEmail?.trim().toLowerCase() ?? null;

    return z.object({
        newEmail: z
            .string()
            .trim()
            .min(1, validation.emailRequired)
            .max(EMAIL_MAX, validation.emailMax)
            .email(validation.emailInvalid)
            .refine(
                (value) => value.toLowerCase() !== normalizedCurrent,
                validation.emailSameAsCurrent
            ),
        currentPassword: z
            .string()
            .min(1, validation.passwordRequired)
            .min(EXISTING_PASSWORD_MIN_LENGTH, validation.passwordMin),
    });
}
