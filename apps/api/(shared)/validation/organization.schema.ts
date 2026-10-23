import { locales } from "@repo/internationalization/utils";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { z } from "zod";

/** RFC 5321 caps a forward path at 254 characters. */
const INVITATION_EMAIL_MAX = 254;

/** 32 random bytes in base64url, no padding. */
const INVITATION_TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

export const createInvitationSchema = z
    .object({
        email: z
            .string()
            .trim()
            .toLowerCase()
            .max(INVITATION_EMAIL_MAX)
            .email(),
        locale: z.enum(locales).optional(),
    })
    .strict();

export const invitationTokenSchema = z
    .object({ token: z.string().regex(INVITATION_TOKEN_RE) })
    .strict();

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type InvitationTokenInput = z.infer<typeof invitationTokenSchema>;

type ParseResult<T> =
    | { ok: true; value: T }
    | { ok: false; response: Response };

const validationFailed = (): { ok: false; response: Response } => ({
    ok: false,
    response: Response.json(
        { error: { code: "VALIDATION_FAILED" } },
        { status: HTTP_STATUS.BAD_REQUEST }
    ),
});

export function parseCreateInvitation(
    body: unknown
): ParseResult<CreateInvitationInput> {
    const parsed = createInvitationSchema.safeParse(body);
    return parsed.success
        ? { ok: true, value: parsed.data }
        : validationFailed();
}

export function parseInvitationToken(
    body: unknown
): ParseResult<InvitationTokenInput> {
    const parsed = invitationTokenSchema.safeParse(body);
    return parsed.success
        ? { ok: true, value: parsed.data }
        : validationFailed();
}
