import { UserType } from "@repo/sdk/src/types";
import { z } from "zod";

const MIN_PASSWORD_LENGTH = 6;
const MAX_DISPLAY_NAME_LENGTH = 120;

export const adminCreateUserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(MIN_PASSWORD_LENGTH),
    type: z.nativeEnum(UserType),
    displayName: z.string().trim().max(MAX_DISPLAY_NAME_LENGTH).optional(),
});

export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;

const adminUpdateUserSchema = z.object({
    type: z.nativeEnum(UserType).optional(),
    displayName: z
        .union([z.string().trim().max(MAX_DISPLAY_NAME_LENGTH), z.null()])
        .optional(),
});

export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;

export function parseAdminUpdateUserInput(
    body: unknown
):
    | { ok: true; value: AdminUpdateUserInput }
    | { ok: false; response: Response } {
    const parsed = adminUpdateUserSchema.safeParse(body);
    if (!parsed.success) {
        return {
            ok: false,
            response: Response.json(
                { error: { code: "VALIDATION_FAILED" } },
                { status: 400 }
            ),
        };
    }
    if (
        parsed.data.type === undefined &&
        parsed.data.displayName === undefined
    ) {
        return {
            ok: false,
            response: Response.json(
                { error: { code: "USERS_NOTHING_TO_UPDATE" } },
                { status: 400 }
            ),
        };
    }
    return { ok: true, value: parsed.data };
}
