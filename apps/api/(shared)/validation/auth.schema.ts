import { locales } from "@repo/internationalization/utils";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { z } from "zod";
import {
    existingPasswordSchema,
    isPasswordTooShort,
    newPasswordSchema,
    passwordTooShortResponse,
} from "./password.schema";

const EMAIL_MAX = 320;
const OOB_CODE_MAX = 2048;
const GOOGLE_ID_TOKEN_MAX = 4096;
const REQUEST_URI_MAX = 2048;
const HTTP_PROTOCOL = /^https?$/;

const localeSchema = z.enum(locales);
const oobCodeSchema = z.string().trim().min(1).max(OOB_CODE_MAX);

export const passwordResetRequestSchema = z.object({
    email: z.string().trim().max(EMAIL_MAX).email(),
    locale: localeSchema.optional(),
});

export const passwordResetConfirmSchema = z.object({
    oobCode: oobCodeSchema,
    password: newPasswordSchema,
});

export const signUpSchema = z.object({
    email: z.string().trim().max(EMAIL_MAX).email(),
    password: newPasswordSchema,
});

export const signInSchema = z.object({
    email: z.string().trim().max(EMAIL_MAX).email(),
    password: existingPasswordSchema,
});

export const googleSignInSchema = z.object({
    idToken: z.string().min(1).max(GOOGLE_ID_TOKEN_MAX),
    requestUri: z
        .url({ protocol: HTTP_PROTOCOL })
        .max(REQUEST_URI_MAX)
        .optional(),
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
export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type GoogleSignInInput = z.infer<typeof googleSignInSchema>;
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

const validationFailed = (): Response =>
    Response.json(
        { error: { code: "VALIDATION_FAILED" } },
        { status: HTTP_STATUS.BAD_REQUEST }
    );

function parseWith<T>(schema: z.ZodType<T>, body: unknown): ParseResult<T> {
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
        return { ok: false, response: validationFailed() };
    }
    return { ok: true, value: parsed.data };
}

/** Same as `parseWith`, but a password under the minimum length gets its own code. */
function parseWithPasswordPolicy<T>(
    schema: z.ZodType<T>,
    body: unknown
): ParseResult<T> {
    const parsed = schema.safeParse(body);
    if (parsed.success) {
        return { ok: true, value: parsed.data };
    }
    return {
        ok: false,
        response: isPasswordTooShort(parsed.error)
            ? passwordTooShortResponse()
            : validationFailed(),
    };
}

export const parseSignUp = (body: unknown) =>
    parseWithPasswordPolicy(signUpSchema, body);

export const parseSignIn = (body: unknown) => parseWith(signInSchema, body);

export const parseGoogleSignIn = (body: unknown) =>
    parseWith(googleSignInSchema, body);

export const parsePasswordResetRequest = (body: unknown) =>
    parseWith(passwordResetRequestSchema, body);

export const parsePasswordResetConfirm = (body: unknown) =>
    parseWithPasswordPolicy(passwordResetConfirmSchema, body);

export const parseEmailVerificationSend = (body: unknown) =>
    parseWith(emailVerificationSendSchema, body);

export const parseEmailVerificationConfirm = (body: unknown) =>
    parseWith(emailVerificationConfirmSchema, body);

export const parseEmailChangeConfirm = (body: unknown) =>
    parseWith(emailVerificationConfirmSchema, body);
