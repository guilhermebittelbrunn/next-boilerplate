import type { globalTranslations } from "@repo/internationalization/translations/global";
import { z } from "zod";

type Dictionary = (typeof globalTranslations)[keyof typeof globalTranslations];

const MIN_PASSWORD_LENGTH = 6;

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
            .min(MIN_PASSWORD_LENGTH, validation.min),
    });
}
