import type { globalTranslations } from "@repo/internationalization/translations/global";
import { EXISTING_PASSWORD_MIN_LENGTH } from "@repo/shared/utils/helpers/passwordPolicy";
import { z } from "zod";

type Dictionary = (typeof globalTranslations)[keyof typeof globalTranslations];

export type AccountDeletionFormValues = {
    currentPassword: string;
};

export function buildAccountDeletionSchema(dictionary: Dictionary) {
    const validation =
        dictionary.apps.app.pages.common.account.privacy.delete.validation;

    return z.object({
        currentPassword: z
            .string()
            .min(1, validation.required)
            .min(EXISTING_PASSWORD_MIN_LENGTH, validation.min),
    });
}
