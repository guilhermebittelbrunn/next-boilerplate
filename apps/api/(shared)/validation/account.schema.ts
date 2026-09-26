import { ONBOARDING_STEPS, type OnboardingStepId } from "@repo/sdk/src/types";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { z } from "zod";
import {
    existingPasswordSchema,
    isPasswordTooShort,
    newPasswordSchema,
    passwordTooShortResponse,
} from "./password.schema";

const DISPLAY_NAME_MAX = 120;
const PHONE_MAX = 32;
const AVATAR_REFERENCE_MAX = 2048;

export const themeSchema = z.enum(["light", "dark", "system"]);
export const localeSchema = z.enum(["pt-br", "en", "es"]);

const preferencesSchema = z
    .object({
        theme: themeSchema,
        locale: localeSchema,
    })
    .strict()
    .partial();

/**
 * `.strict()` is the ownership guard of this payload: the account the request writes to
 * is always derived from the token, so a body that carries `id`, `uid` or `type` is a
 * privilege-escalation attempt and must fail loudly instead of being silently ignored.
 */
export const updateAccountSchema = z
    .object({
        displayName: z
            .union([z.string().trim().max(DISPLAY_NAME_MAX), z.null()])
            .optional(),
        phone: z.union([z.string().trim().max(PHONE_MAX), z.null()]).optional(),
        avatar: z
            .union([z.string().trim().max(AVATAR_REFERENCE_MAX), z.null()])
            .optional(),
        preferences: preferencesSchema.optional(),
    })
    .strict();

export const changePasswordSchema = z
    .object({
        currentPassword: existingPasswordSchema,
        password: newPasswordSchema,
    })
    .strict();

/**
 * Same `.strict()` guard as the payloads above, and the same reason: the account being
 * erased comes from the token, so a body carrying `id` or `uid` is an attempt to erase
 * someone else and has to fail loudly.
 */
export const deleteAccountSchema = z
    .object({
        currentPassword: existingPasswordSchema,
    })
    .strict();

const onboardingStepIds = ONBOARDING_STEPS.map(({ id }) => id) as [
    OnboardingStepId,
    ...OnboardingStepId[],
];

/** Same `.strict()` guard: the profile that advances is the one the token resolves to. */
export const advanceOnboardingSchema = z
    .object({
        step: z.enum(onboardingStepIds),
        outcome: z.enum(["completed", "skipped"]),
    })
    .strict();

export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
export type AdvanceOnboardingInput = z.infer<typeof advanceOnboardingSchema>;

const validationFailed = (): Response =>
    Response.json(
        { error: { code: "VALIDATION_FAILED" } },
        { status: HTTP_STATUS.BAD_REQUEST }
    );

export function parseUpdateAccount(
    body: unknown
): { ok: true; value: UpdateAccountInput } | { ok: false; response: Response } {
    const parsed = updateAccountSchema.safeParse(body);
    if (!parsed.success) {
        return { ok: false, response: validationFailed() };
    }

    const hasPreferences =
        parsed.data.preferences !== undefined &&
        Object.keys(parsed.data.preferences).length > 0;
    const hasField =
        parsed.data.displayName !== undefined ||
        parsed.data.phone !== undefined ||
        parsed.data.avatar !== undefined ||
        hasPreferences;

    if (!hasField) {
        return {
            ok: false,
            response: Response.json(
                { error: { code: "ACCOUNT_NOTHING_TO_UPDATE" } },
                { status: HTTP_STATUS.BAD_REQUEST }
            ),
        };
    }

    return { ok: true, value: parsed.data };
}

export function parseChangePassword(
    body: unknown
):
    | { ok: true; value: ChangePasswordInput }
    | { ok: false; response: Response } {
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
        return {
            ok: false,
            response: isPasswordTooShort(parsed.error)
                ? passwordTooShortResponse()
                : validationFailed(),
        };
    }
    return { ok: true, value: parsed.data };
}

export function parseDeleteAccount(
    body: unknown
): { ok: true; value: DeleteAccountInput } | { ok: false; response: Response } {
    const parsed = deleteAccountSchema.safeParse(body);
    if (!parsed.success) {
        return {
            ok: false,
            response: Response.json(
                { error: { code: "ACCOUNT_DELETION_CONFIRMATION_INVALID" } },
                { status: HTTP_STATUS.BAD_REQUEST }
            ),
        };
    }
    return { ok: true, value: parsed.data };
}

export function parseAdvanceOnboarding(
    body: unknown
):
    | { ok: true; value: AdvanceOnboardingInput }
    | { ok: false; response: Response } {
    const parsed = advanceOnboardingSchema.safeParse(body);
    if (!parsed.success) {
        return { ok: false, response: validationFailed() };
    }
    return { ok: true, value: parsed.data };
}
