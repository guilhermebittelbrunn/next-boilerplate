import { globalTranslations } from "@repo/internationalization/translations/global";
import { describe, expect, it } from "vitest";

const LOCALES = ["pt-br", "en", "es"] as const;

type Locale = (typeof LOCALES)[number];

function questionsBeforeLink(locale: Locale): Record<string, string> {
    const { app, web } = globalTranslations[locale].apps;
    return {
        "app signIn.noAccount": app.pages.signIn.noAccount,
        "web signIn.noAccount": web.pages.signIn.noAccount,
        "app signUp.alreadyHaveAccount": app.pages.signUp.alreadyHaveAccount,
    };
}

describe.each(LOCALES)("sign-in and sign-up copy in %s", (locale) => {
    const signUpCopy = globalTranslations[locale].apps.app.pages.signUp;
    const signInCopy = globalTranslations[locale].apps.app.pages.signIn;

    it("does not reuse the sign-in copy on the sign-up page", () => {
        expect(signUpCopy.alreadyHaveAccount).not.toBe(signInCopy.noAccount);
        expect(signUpCopy.createYourAccount).not.toBe(
            signInCopy.enterWithYourAccount
        );
        expect(signUpCopy.meta.description).not.toBe(
            signInCopy.meta.description
        );
    });

    // The question and its link are sibling JSX nodes on separate lines, and
    // JSX drops the whitespace between them: this space is the only gap left.
    it.each(Object.entries(questionsBeforeLink(locale)))(
        "%s ends with the space before its link",
        (_key, question) => {
            expect(question.endsWith(" ")).toBe(true);
        }
    );
});

describe("Spanish questions before a link", () => {
    it.each(Object.entries(questionsBeforeLink("es")))(
        "%s opens with the inverted question mark",
        (_key, question) => {
            expect(question.startsWith("¿")).toBe(true);
        }
    );
});
