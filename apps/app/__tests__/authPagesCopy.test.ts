import { globalTranslations } from "@repo/internationalization/translations/global";
import { describe, expect, it } from "vitest";

const LOCALES = ["pt-br", "en", "es"] as const;

type Locale = (typeof LOCALES)[number];

const PASSWORD_MISMATCH_PHRASE: Record<Locale, string> = {
    "pt-br": "não coincidem",
    en: "do not match",
    es: "no coinciden",
};

function questionsBeforeLink(locale: Locale): Record<string, string> {
    const { app, web } = globalTranslations[locale].apps;
    return {
        "app signIn.noAccount": app.pages.signIn.noAccount,
        "web signIn.noAccount": web.pages.signIn.noAccount,
        "app signUp.alreadyHaveAccount": app.pages.signUp.alreadyHaveAccount,
        "web signUp.alreadyHaveAccount": web.pages.signUp.alreadyHaveAccount,
    };
}

function passwordMismatchMessages(locale: Locale): Record<string, string> {
    const { app, web } = globalTranslations[locale].apps;
    return {
        "app signUp": app.pages.signUp.validation.passwordsDoNotMatch,
        "web signUp": web.pages.signUp.validation.passwordsDoNotMatch,
        "app resetPassword":
            app.pages.resetPassword.validation.passwordsDoNotMatch,
        "app account security":
            app.pages.common.account.security.validation.mismatch,
        "app admin users":
            app.pages.admin.users.form.validation.passwordMismatch,
    };
}

describe.each(LOCALES)("sign-in and sign-up copy in %s", (locale) => {
    const { app, web } = globalTranslations[locale].apps;

    it.each([
        ["app", app.pages],
        ["web", web.pages],
    ] as const)(
        "does not reuse the sign-in copy on the %s sign-up page",
        (_appName, pages) => {
            const { signIn, signUp } = pages;
            expect(signUp.alreadyHaveAccount).not.toBe(signIn.noAccount);
            expect(signUp.createYourAccount).not.toBe(
                signIn.enterWithYourAccount
            );
            expect(signUp.meta.description).not.toBe(signIn.meta.description);
        }
    );

    // The question and its link are sibling JSX nodes on separate lines, and
    // JSX drops the whitespace between them: this space is the only gap left.
    it.each(Object.entries(questionsBeforeLink(locale)))(
        "%s ends with the space before its link",
        (_key, question) => {
            expect(question.endsWith(" ")).toBe(true);
        }
    );

    it.each(Object.entries(passwordMismatchMessages(locale)))(
        "%s says the passwords do not match with the shared phrase",
        (_key, message) => {
            expect(message).toContain(PASSWORD_MISMATCH_PHRASE[locale]);
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
