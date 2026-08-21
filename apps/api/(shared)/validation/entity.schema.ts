import { EntityType } from "@repo/sdk/src/types";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { z } from "zod";

const NAME_MAX = 255;
const DESCRIPTION_MAX = 10_000;
const PHOTO_URL_MAX = 2048;

const entityTypeSchema = z.nativeEnum(EntityType);

const genreSchema = z.enum(["male", "female", "other"]).optional().nullable();

const birthdateSchema = z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable();

export const createEntitySchema = z.object({
    name: z.string().trim().min(1).max(NAME_MAX),
    description: z.string().max(DESCRIPTION_MAX),
    type: entityTypeSchema,
    photo: z.string().trim().max(PHOTO_URL_MAX).optional().nullable(),
    genre: genreSchema,
    birthdate: birthdateSchema,
    enabled: z.boolean().optional(),
});

export const updateEntitySchema = z
    .object({
        name: z.string().trim().min(1).max(NAME_MAX).optional(),
        description: z.string().max(DESCRIPTION_MAX).optional(),
        type: entityTypeSchema.optional(),
        photo: z.string().trim().max(PHOTO_URL_MAX).optional().nullable(),
        genre: genreSchema,
        birthdate: birthdateSchema,
        enabled: z.boolean().optional(),
    })
    .refine((value) => Object.keys(value).length > 0, {
        message: "empty",
    });

export type CreateEntityInput = z.infer<typeof createEntitySchema>;
export type UpdateEntityInput = z.infer<typeof updateEntitySchema>;

export function parseCreateEntity(
    body: unknown
): { ok: true; value: CreateEntityInput } | { ok: false; response: Response } {
    const parsed = createEntitySchema.safeParse(body);
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

export function parseUpdateEntity(
    body: unknown
): { ok: true; value: UpdateEntityInput } | { ok: false; response: Response } {
    const parsed = updateEntitySchema.safeParse(body);
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
