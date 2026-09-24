import { describe, expect, it } from "vitest";
import { legalTranslations } from "../translations/apps/web/pages/legal/index";

/**
 * `parity.test.ts` treats an array as a single leaf, so `privacy.sections` counts as one
 * key however many entries it holds — a section added to one language only would slip
 * past it. These assertions cover the arrays that test cannot see.
 */
const LOCALES = ["pt-br", "en", "es"] as const;

const COOKIE_NAMES = [
    "access-token",
    "bp:cookie-consent",
    "x-theme",
    "x-locale",
    "sidebar_state",
    "bp:panel-request-role",
    "bp:impersonate-firebase-uid",
];

function sectionBodies(locale: (typeof LOCALES)[number]): string {
    return legalTranslations[locale].privacy.sections
        .map((section) => section.body)
        .join("\n");
}

describe("seções das páginas legais", () => {
    it("tem o mesmo número de seções nos três idiomas", () => {
        const counts = LOCALES.map(
            (locale) => legalTranslations[locale].privacy.sections.length
        );

        expect(new Set(counts).size).toBe(1);
    });

    it("mantém a paridade também nos termos de uso", () => {
        const counts = LOCALES.map(
            (locale) => legalTranslations[locale].terms.sections.length
        );

        expect(new Set(counts).size).toBe(1);
    });

    for (const locale of LOCALES) {
        it(`declara em ${locale} cada cookie que o boilerplate grava`, () => {
            const bodies = sectionBodies(locale);

            for (const cookie of COOKIE_NAMES) {
                expect(bodies).toContain(cookie);
            }
        });

        it(`anuncia em ${locale} o prazo de resposta de 15 dias`, () => {
            expect(sectionBodies(locale)).toContain("15");
        });

        it(`publica em ${locale} o canal de privacidade`, () => {
            const contact = legalTranslations[locale].contact;

            expect(contact.title).toBeTruthy();
            expect(contact.description).toBeTruthy();
            expect(contact.formLabel).toBeTruthy();
        });
    }
});
