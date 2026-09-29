import { globalTranslations } from "@repo/internationalization/translations/global";
import { describe, expect, it } from "vitest";
import { buildAccountEmailChangeSchema } from "@/app/[locale]/(authenticated)/(common)/(pages)/account/(validations)/accountEmailChangeSchema";

const LOCALES = ["pt-br", "en", "es"] as const;
const CURRENT_EMAIL = "owner@example.com";
const EMAIL_DOMAIN = "@example.com";
const EMAIL_MAX_LENGTH = 320;
const EMAIL_ONE_OVER = `${"a".repeat(EMAIL_MAX_LENGTH + 1 - EMAIL_DOMAIN.length)}${EMAIL_DOMAIN}`;
const VALID = { newEmail: "owner.new@example.com", currentPassword: "123456" };

function messagesFor(
    locale: (typeof LOCALES)[number],
    values: { newEmail: string; currentPassword: string },
    currentEmail: string | null = CURRENT_EMAIL
) {
    const parsed = buildAccountEmailChangeSchema(
        globalTranslations[locale],
        currentEmail
    ).safeParse(values);

    return parsed.success
        ? []
        : parsed.error.issues.map((issue) => issue.message);
}

describe("buildAccountEmailChangeSchema", () => {
    it("aceita um endereço novo e uma senha com o tamanho mínimo", () => {
        expect(messagesFor("pt-br", VALID)).toEqual([]);
    });

    it("aceita qualquer endereço quando o atual ainda não carregou", () => {
        expect(
            messagesFor("pt-br", { ...VALID, newEmail: CURRENT_EMAIL }, null)
        ).toEqual([]);
    });

    for (const locale of LOCALES) {
        const validation =
            globalTranslations[locale].apps.app.pages.common.account.profile
                .emailChange.validation;

        it(`cobra o novo e-mail em ${locale}`, () => {
            expect(messagesFor(locale, { ...VALID, newEmail: "" })).toContain(
                validation.emailRequired
            );
        });

        it(`recusa um e-mail malformado em ${locale}`, () => {
            expect(
                messagesFor(locale, { ...VALID, newEmail: "not-an-email" })
            ).toContain(validation.emailInvalid);
        });

        it(`recusa um e-mail com mais de 320 caracteres em ${locale}`, () => {
            expect(
                messagesFor(locale, {
                    ...VALID,
                    newEmail: EMAIL_ONE_OVER,
                })
            ).toContain(validation.emailMax);
        });

        it(`recusa o endereço atual, sem diferenciar maiúsculas nem espaços, em ${locale}`, () => {
            expect(
                messagesFor(locale, {
                    ...VALID,
                    newEmail: "  OWNER@Example.com ",
                })
            ).toEqual([validation.emailSameAsCurrent]);
        });

        it(`cobra a senha em ${locale}`, () => {
            expect(
                messagesFor(locale, { ...VALID, currentPassword: "" })
            ).toContain(validation.passwordRequired);
        });

        it(`cobra o tamanho mínimo da senha em ${locale}`, () => {
            expect(
                messagesFor(locale, { ...VALID, currentPassword: "abc" })
            ).toEqual([validation.passwordMin]);
        });
    }
});
