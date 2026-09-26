import { globalTranslations } from "@repo/internationalization/translations/global";
import { PASSWORD_MIN_LENGTH } from "@repo/shared/utils/helpers/passwordPolicy";
import { describe, expect, it } from "vitest";
import { buildSignUpSchema } from "@/app/[locale]/sign-up/validations/signUp";

const LOCALES = ["pt-br", "en", "es"] as const;
const EMAIL = "qa-password-policy-web@example.com";
const ONE_SHORT = "a".repeat(PASSWORD_MIN_LENGTH - 1);
const AT_MINIMUM = "a".repeat(PASSWORD_MIN_LENGTH);

describe.each(LOCALES)("web sign-up schema in %s", (locale) => {
    const dictionary = globalTranslations[locale];
    const validation = dictionary.apps.web.pages.signUp.validation;
    const schema = buildSignUpSchema(dictionary);

    it("accepts matching passwords at the minimum length", () => {
        expect(
            schema.safeParse({
                email: EMAIL,
                password: AT_MINIMUM,
                confirmPassword: AT_MINIMUM,
            }).success
        ).toBe(true);
    });

    it("refuses one character short with the dictionary copy", () => {
        const result = schema.safeParse({
            email: EMAIL,
            password: ONE_SHORT,
            confirmPassword: ONE_SHORT,
        });

        expect(result.error?.issues[0]?.path).toEqual(["password"]);
        expect(result.error?.issues[0]?.message).toBe(validation.passwordMin);
    });

    it("refuses an invalid email with the dictionary copy", () => {
        const result = schema.safeParse({
            email: "nope",
            password: AT_MINIMUM,
            confirmPassword: AT_MINIMUM,
        });

        expect(result.error?.issues[0]?.message).toBe(validation.emailInvalid);
    });

    it("blames the confirmation field when the two differ", () => {
        const result = schema.safeParse({
            email: EMAIL,
            password: AT_MINIMUM,
            confirmPassword: `${AT_MINIMUM}b`,
        });

        expect(result.error?.issues[0]?.path).toEqual(["confirmPassword"]);
        expect(result.error?.issues[0]?.message).toBe(
            validation.passwordsDoNotMatch
        );
    });
});
