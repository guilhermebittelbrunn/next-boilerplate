import { globalTranslations } from "@repo/internationalization/translations/global";
import { describe, expect, it } from "vitest";
import { buildInviteMemberFormSchema } from "@/app/[locale]/(authenticated)/(common)/(pages)/organization/(validations)/inviteMemberFormSchema";

describe("buildInviteMemberFormSchema", () => {
    it.each(["pt-br", "en", "es"] as const)(
        "explains a missing and an invalid address in %s",
        (locale) => {
            const dictionary = globalTranslations[locale];
            const validation =
                dictionary.apps.app.pages.common.organization.invite.validation;
            const schema = buildInviteMemberFormSchema(dictionary);

            const missing = schema.safeParse({ email: "   " });
            const invalid = schema.safeParse({ email: "not-an-address" });

            expect(missing.success).toBe(false);
            expect(missing.error?.issues[0]?.message).toBe(validation.required);
            expect(invalid.success).toBe(false);
            expect(invalid.error?.issues[0]?.message).toBe(validation.invalid);
        }
    );

    it("accepts a valid address, trimmed", () => {
        const schema = buildInviteMemberFormSchema(globalTranslations["pt-br"]);

        expect(
            schema.parse({ email: "  qa-teams-organizations@example.com " })
        ).toEqual({ email: "qa-teams-organizations@example.com" });
    });
});
