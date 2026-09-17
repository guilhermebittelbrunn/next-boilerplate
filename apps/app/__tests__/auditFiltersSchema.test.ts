import { globalTranslations } from "@repo/internationalization/translations/global";
import { describe, expect, it } from "vitest";
import {
    auditFiltersDefaults,
    auditUserAll,
    buildAuditFiltersSchema,
} from "@/app/[locale]/(authenticated)/(admin)/admin/(pages)/audit/(validations)/auditFiltersSchema";

const locales = ["pt-br", "en", "es"] as const;

const schema = buildAuditFiltersSchema(globalTranslations["pt-br"]);

describe("buildAuditFiltersSchema", () => {
    it("accepts the untouched form, which means no filter at all", () => {
        expect(schema.safeParse(auditFiltersDefaults).success).toBe(true);
    });

    it("defaults the user field to the sentinel the select needs", () => {
        expect(auditFiltersDefaults.userId).toBe(auditUserAll);
    });

    it("accepts a period whose ends are in order", () => {
        expect(
            schema.safeParse({
                ...auditFiltersDefaults,
                from: "2026-09-01",
                to: "2026-09-16",
            }).success
        ).toBe(true);
    });

    it("accepts the same day on both ends", () => {
        expect(
            schema.safeParse({
                ...auditFiltersDefaults,
                from: "2026-09-16",
                to: "2026-09-16",
            }).success
        ).toBe(true);
    });

    it("accepts an open-ended period", () => {
        expect(
            schema.safeParse({ ...auditFiltersDefaults, from: "2026-09-01" })
                .success
        ).toBe(true);
        expect(
            schema.safeParse({ ...auditFiltersDefaults, to: "2026-09-16" })
                .success
        ).toBe(true);
    });

    it("refuses a period that ends before it starts", () => {
        const parsed = schema.safeParse({
            ...auditFiltersDefaults,
            from: "2026-09-16",
            to: "2026-09-01",
        });

        expect(parsed.success).toBe(false);
    });

    it("points the inverted-range error at the field the user fixes", () => {
        const parsed = schema.safeParse({
            ...auditFiltersDefaults,
            from: "2026-09-16",
            to: "2026-09-01",
        });

        expect(parsed.success).toBe(false);
        if (!parsed.success) {
            expect(parsed.error.issues[0]?.path).toEqual(["to"]);
        }
    });

    it("takes the message from the dictionary in every locale", () => {
        for (const locale of locales) {
            const dictionary = globalTranslations[locale];
            const parsed = buildAuditFiltersSchema(dictionary).safeParse({
                ...auditFiltersDefaults,
                from: "2026-09-16",
                to: "2026-09-01",
            });

            expect(parsed.success).toBe(false);
            if (!parsed.success) {
                expect(parsed.error.issues[0]?.message).toBe(
                    dictionary.apps.app.pages.admin.auditTrail.filters
                        .validation.rangeInverted
                );
            }
        }
    });
});
