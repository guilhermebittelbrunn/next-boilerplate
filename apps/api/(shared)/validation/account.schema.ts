import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { z } from "zod";

const DISPLAY_NAME_MAX = 120;
const PHONE_MAX = 32;
const AVATAR_REFERENCE_MAX = 2048;
const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 1024;

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
        currentPassword: z
            .string()
            .min(MIN_PASSWORD_LENGTH)
            .max(MAX_PASSWORD_LENGTH),
        password: z.string().min(MIN_PASSWORD_LENGTH).max(MAX_PASSWORD_LENGTH),
    })
    .strict();

export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

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
        return { ok: false, response: validationFailed() };
    }
    return { ok: true, value: parsed.data };
}
