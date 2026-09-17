import type { globalTranslations } from "@repo/internationalization/translations/global";
import { z } from "zod";

type Dictionary = (typeof globalTranslations)[keyof typeof globalTranslations];

/** Sentinel for "no user filter": the select needs a value, and empty is not one. */
export const auditUserAll = "__all__" as const;

export type AuditFiltersFormValues = {
    userId: string;
    from: string;
    to: string;
};

export const auditFiltersDefaults: AuditFiltersFormValues = {
    userId: auditUserAll,
    from: "",
    to: "",
};

export function buildAuditFiltersSchema(dictionary: Dictionary) {
    const validation =
        dictionary.apps.app.pages.admin.auditTrail.filters.validation;

    return z
        .object({
            userId: z.string(),
            from: z.string(),
            to: z.string(),
        })
        .refine(
            (value) => !(value.from && value.to) || value.from <= value.to,
            {
                message: validation.rangeInverted,
                path: ["to"],
            }
        );
}
