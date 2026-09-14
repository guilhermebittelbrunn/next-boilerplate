import type { globalTranslations } from "@repo/internationalization/translations/global";
import { EntityType } from "@repo/sdk/src/types";
import { z } from "zod";

type Dictionary = (typeof globalTranslations)[keyof typeof globalTranslations];

const NAME_MAX = 255;
const DESCRIPTION_MAX = 10_000;
const PHOTO_URL_MAX = 2048;
const BIRTHDATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const STORAGE_OBJECT_PATH_RE =
    /^uploads\/[A-Za-z0-9_-]{1,128}\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

/**
 * The field holds a reference, not a picture: either an object already uploaded to the
 * bucket or an absolute http(s) URL. Pinning the scheme is what keeps `javascript:` out,
 * since it parses as a URL and the value reaches the `src` of a rendered image.
 */
function isPhotoReference(value: string): boolean {
    const trimmed = value.trim();
    if (trimmed === "" || STORAGE_OBJECT_PATH_RE.test(trimmed)) {
        return true;
    }
    try {
        const url = new URL(trimmed);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

export const entityGenreValues = ["male", "female", "other"] as const;
export type EntityGenreValue = (typeof entityGenreValues)[number];

export const entityGenreUnset = "__none__" as const;

export function resolveEntityGenreFormValue(
    stored: string | null | undefined
): typeof entityGenreUnset | (typeof entityGenreValues)[number] {
    if (stored && (entityGenreValues as readonly string[]).includes(stored)) {
        return stored as (typeof entityGenreValues)[number];
    }
    return entityGenreUnset;
}

export type EntityFormValues = {
    name: string;
    description: string;
    type: EntityType;
    photo: string;
    genre: typeof entityGenreUnset | (typeof entityGenreValues)[number];
    birthdate: string;
    enabled: boolean;
};

export function buildEntityFormSchema(dictionary: Dictionary) {
    const validation =
        dictionary.apps.app.pages.common.entities.form.validation;

    return z.object({
        name: z
            .string()
            .trim()
            .min(1, validation.nameRequired)
            .max(NAME_MAX, validation.nameMax),
        description: z.string().max(DESCRIPTION_MAX, validation.descriptionMax),
        type: z.nativeEnum(EntityType),
        photo: z
            .string()
            .max(PHOTO_URL_MAX, validation.photoMax)
            .refine(isPhotoReference, { message: validation.photoReference }),
        genre: z.union([
            z.literal(entityGenreUnset),
            z.enum(entityGenreValues),
        ]),
        birthdate: z
            .string()
            .refine(
                (value) =>
                    value.trim() === "" || BIRTHDATE_RE.test(value.trim()),
                validation.birthdateInvalid
            ),
        enabled: z.boolean(),
    });
}
