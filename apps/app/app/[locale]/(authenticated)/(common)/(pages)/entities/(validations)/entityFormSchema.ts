import type { globalTranslations } from "@repo/internationalization/translations/global";
import { EntityType } from "@repo/sdk/src/types";
import { z } from "zod";

type Dictionary = (typeof globalTranslations)[keyof typeof globalTranslations];

const NAME_MAX = 255;
const DESCRIPTION_MAX = 10_000;
const PHOTO_URL_MAX = 2048;
const BIRTHDATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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
            .refine(
                (value) => {
                    const trimmed = value.trim();
                    if (trimmed === "") {
                        return true;
                    }
                    return URL.canParse(trimmed);
                },
                { message: validation.photoUrl }
            ),
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
