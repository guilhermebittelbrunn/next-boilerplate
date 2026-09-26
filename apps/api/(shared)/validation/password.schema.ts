import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import {
    EXISTING_PASSWORD_MIN_LENGTH,
    PASSWORD_MAX_LENGTH,
    PASSWORD_MIN_LENGTH,
} from "@repo/shared/utils/helpers/passwordPolicy";
import { z } from "zod";

/** Never trimmed: a space is a character of the password the person typed. */
export const newPasswordSchema = z
    .string()
    .min(PASSWORD_MIN_LENGTH)
    .max(PASSWORD_MAX_LENGTH);

export const existingPasswordSchema = z
    .string()
    .min(EXISTING_PASSWORD_MIN_LENGTH)
    .max(PASSWORD_MAX_LENGTH);

export function isPasswordTooShort(
    error: z.ZodError,
    field = "password"
): boolean {
    return error.issues.some(
        (issue) => issue.code === "too_small" && issue.path[0] === field
    );
}

export const passwordTooShortResponse = (): Response =>
    Response.json(
        { error: { code: "AUTH_PASSWORD_TOO_SHORT" } },
        { status: HTTP_STATUS.BAD_REQUEST }
    );
