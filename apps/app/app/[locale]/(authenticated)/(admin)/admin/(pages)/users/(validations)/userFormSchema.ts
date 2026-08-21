import type { globalTranslations } from "@repo/internationalization/translations/global";
import { UserType } from "@repo/sdk/src/types";
import { z } from "zod";

type Dictionary = (typeof globalTranslations)[keyof typeof globalTranslations];

const MIN_PASSWORD_LENGTH = 6;
const MAX_DISPLAY_NAME_LENGTH = 120;

export function buildCreateUserFormSchema(dictionary: Dictionary) {
    const v = dictionary.apps.app.pages.admin.users.form.validation;

    return z
        .object({
            email: z.string().email(v.emailInvalid),
            password: z.string().min(MIN_PASSWORD_LENGTH, v.passwordMin),
            confirmPassword: z.string().min(1, v.passwordMismatch),
            displayName: z
                .string()
                .trim()
                .max(MAX_DISPLAY_NAME_LENGTH)
                .optional(),
            type: z.nativeEnum(UserType),
        })
        .refine((data) => data.password === data.confirmPassword, {
            message: v.passwordMismatch,
            path: ["confirmPassword"],
        });
}

export type CreateUserFormValues = z.infer<
    ReturnType<typeof buildCreateUserFormSchema>
>;

export function buildUpdateUserFormSchema(_dictionary: Dictionary) {
    return z.object({
        // Read-only in the form (shown for context); never sent to the API.
        email: z.string().optional(),
        displayName: z
            .string()
            .trim()
            .max(MAX_DISPLAY_NAME_LENGTH)
            .optional()
            .or(z.literal("")),
        type: z.nativeEnum(UserType),
    });
}

export type UpdateUserFormValues = z.infer<
    ReturnType<typeof buildUpdateUserFormSchema>
>;
