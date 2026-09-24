import { globalTranslations } from "@repo/internationalization/translations/global";
import { describe, expect, it } from "vitest";
import { buildAccountDeletionSchema } from "@/app/[locale]/(authenticated)/(common)/(pages)/account/(validations)/accountDeletionSchema";

const LOCALES = ["pt-br", "en", "es"] as const;

function firstMessage(locale: (typeof LOCALES)[number], value: string) {
    const parsed = buildAccountDeletionSchema(
        globalTranslations[locale]
    ).safeParse({ currentPassword: value });

    return parsed.success ? null : parsed.error.issues[0]?.message;
}

describe("buildAccountDeletionSchema", () => {
    it("aceita uma senha com o tamanho mínimo", () => {
        expect(firstMessage("pt-br", "123456")).toBeNull();
    });

    for (const locale of LOCALES) {
        const validation =
            globalTranslations[locale].apps.app.pages.common.account.privacy
                .delete.validation;

        it(`cobra a senha em ${locale} com a mensagem do dicionário`, () => {
            expect(firstMessage(locale, "")).toBe(validation.required);
        });

        it(`cobra o tamanho mínimo em ${locale} com a mensagem do dicionário`, () => {
            expect(firstMessage(locale, "abc")).toBe(validation.min);
        });
    }

    it("não confunde uma senha só de espaços com ausência de senha", () => {
        const validation =
            globalTranslations["pt-br"].apps.app.pages.common.account.privacy
                .delete.validation;

        expect(firstMessage("pt-br", "   ")).toBe(validation.min);
    });
});
