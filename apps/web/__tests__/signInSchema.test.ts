import { globalTranslations } from "@repo/internationalization/translations/global";
import { EXISTING_PASSWORD_MIN_LENGTH } from "@repo/shared/utils/helpers/passwordPolicy";
import { describe, expect, it } from "vitest";
import { buildSignInSchema } from "@/app/[locale]/sign-in/validations/signInSchema";

const LOCALES = ["pt-br", "en", "es"] as const;
const EMAIL = "qa-leftover-ui-strings@example.com";
const ONE_SHORT = "a".repeat(EXISTING_PASSWORD_MIN_LENGTH - 1);
const AT_MINIMUM = "a".repeat(EXISTING_PASSWORD_MIN_LENGTH);

describe.each(LOCALES)("web sign-in schema in %s", (locale) => {
    const dictionary = globalTranslations[locale];
    const validation = dictionary.apps.web.pages.signIn.validation;
    const schema = buildSignInSchema(dictionary);

    it("accepts a password at the existing-account minimum", () => {
        expect(
            schema.safeParse({ email: EMAIL, password: AT_MINIMUM }).success
        ).toBe(true);
    });

    it("refuses one character short with the dictionary copy", () => {
        const result = schema.safeParse({ email: EMAIL, password: ONE_SHORT });

        expect(result.error?.issues[0]?.path).toEqual(["password"]);
        expect(result.error?.issues[0]?.message).toBe(validation.passwordMin);
    });

    it.each(["nope", "qa@example", ""])(
        "refuses the email %j with the dictionary copy",
        (email) => {
            const result = schema.safeParse({ email, password: AT_MINIMUM });

            expect(result.error?.issues[0]?.path).toEqual(["email"]);
            expect(result.error?.issues[0]?.message).toBe(
                validation.emailInvalid
            );
        }
    );
});
