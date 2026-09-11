import { locales } from "@repo/internationalization/utils";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { z } from "zod";

const EMAIL_MAX = 320;
const MIN_PASSWORD_LENGTH = 6;
const PASSWORD_MAX = 1024;
const OOB_CODE_MAX = 2048;

const localeSchema = z.enum(locales);
const oobCodeSchema = z.string().trim().min(1).max(OOB_CODE_MAX);

export const passwordResetRequestSchema = z.object({
    email: z.string().trim().max(EMAIL_MAX).email(),
    locale: localeSchema.optional(),
});

export const passwordResetConfirmSchema = z.object({
    oobCode: oobCodeSchema,
    password: z.string().min(MIN_PASSWORD_LENGTH).max(PASSWORD_MAX),
});

export const emailVerificationSendSchema = z.object({
    locale: localeSchema.optional(),
});

export const emailVerificationConfirmSchema = z.object({
    oobCode: oobCodeSchema,
});

export type PasswordResetRequestInput = z.infer<
    typeof passwordResetRequestSchema
>;
export type PasswordResetConfirmInput = z.infer<
    typeof passwordResetConfirmSchema
>;
export type EmailVerificationSendInput = z.infer<
    typeof emailVerificationSendSchema
>;
export type EmailVerificationConfirmInput = z.infer<
    typeof emailVerificationConfirmSchema
>;

type ParseResult<T> =
    | { ok: true; value: T }
    | { ok: false; response: Response };

function parseWith<T>(schema: z.ZodType<T>, body: unknown): ParseResult<T> {
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        return {
            ok: false,
            response: Response.json(
                { error: { code: "VALIDATION_FAILED" } },
                { status: HTTP_STATUS.BAD_REQUEST }
            ),
        };
    }
    return { ok: true, value: parsed.data };
}

export const parsePasswordResetRequest = (body: unknown) =>
    parseWith(passwordResetRequestSchema, body);

export const parsePasswordResetConfirm = (body: unknown) =>
    parseWith(passwordResetConfirmSchema, body);

export const parseEmailVerificationSend = (body: unknown) =>
    parseWith(emailVerificationSendSchema, body);

export const parseEmailVerificationConfirm = (body: unknown) =>
    parseWith(emailVerificationConfirmSchema, body);
