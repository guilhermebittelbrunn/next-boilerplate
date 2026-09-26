import { globalTranslations } from "@repo/internationalization/translations/global";
import { UserType } from "@repo/sdk/src/types";
import {
    EXISTING_PASSWORD_MIN_LENGTH,
    PASSWORD_MIN_LENGTH,
} from "@repo/shared/utils/helpers/passwordPolicy";
import { describe, expect, it } from "vitest";
import { buildCreateUserFormSchema } from "@/app/[locale]/(authenticated)/(admin)/admin/(pages)/users/(validations)/userFormSchema";
import { buildAccountDeletionSchema } from "@/app/[locale]/(authenticated)/(common)/(pages)/account/(validations)/accountDeletionSchema";
import { buildResetPasswordSchema } from "@/app/[locale]/(unauthenticated)/reset-password/validations/resetPasswordSchema";
import { buildSignInSchema } from "@/app/[locale]/(unauthenticated)/sign-in/validations/signInSchema";
import { buildSignUpSchema } from "@/app/[locale]/(unauthenticated)/sign-up/validations/signUpSchema";

const LOCALES = ["pt-br", "en", "es"] as const;
const ONE_SHORT = "a".repeat(PASSWORD_MIN_LENGTH - 1);
const AT_MINIMUM = "a".repeat(PASSWORD_MIN_LENGTH);
const EXISTING_AT_MINIMUM = "b".repeat(EXISTING_PASSWORD_MIN_LENGTH);
const EMAIL = "qa-password-policy@example.com";

function firstIssue(result: {
    success: boolean;
    error?: { issues: Array<{ path: PropertyKey[]; message: string }> };
}) {
    return result.error?.issues[0];
}

describe.each(LOCALES)("new-password forms in %s", (locale) => {
    const dictionary = globalTranslations[locale];

    it("sign-up refuses one character short with the dictionary copy and accepts the minimum", () => {
        const schema = buildSignUpSchema(dictionary);

        const refused = schema.safeParse({
            email: EMAIL,
            password: ONE_SHORT,
            confirmPassword: ONE_SHORT,
        });
        expect(firstIssue(refused)?.path).toEqual(["password"]);
        expect(firstIssue(refused)?.message).toBe(
            dictionary.apps.app.pages.signUp.validation.passwordMin
        );

        expect(
            schema.safeParse({
                email: EMAIL,
                password: AT_MINIMUM,
                confirmPassword: AT_MINIMUM,
            }).success
        ).toBe(true);
    });

    it("reset refuses one character short with the dictionary copy and accepts the minimum", () => {
        const schema = buildResetPasswordSchema(dictionary);

        const refused = schema.safeParse({
            password: ONE_SHORT,
            confirmPassword: ONE_SHORT,
        });
        expect(firstIssue(refused)?.message).toBe(
            dictionary.apps.app.pages.resetPassword.validation.passwordMin
        );

        expect(
            schema.safeParse({
                password: AT_MINIMUM,
                confirmPassword: AT_MINIMUM,
            }).success
        ).toBe(true);
    });

    it("admin creation refuses one character short with the dictionary copy and accepts the minimum", () => {
        const schema = buildCreateUserFormSchema(dictionary);
        const base = { email: EMAIL, type: UserType.COMMON };

        const refused = schema.safeParse({
            ...base,
            password: ONE_SHORT,
            confirmPassword: ONE_SHORT,
        });
        expect(firstIssue(refused)?.message).toBe(
            dictionary.apps.app.pages.admin.users.form.validation.passwordMin
        );

        expect(
            schema.safeParse({
                ...base,
                password: AT_MINIMUM,
                confirmPassword: AT_MINIMUM,
            }).success
        ).toBe(true);
    });
});

describe("forms that check a password someone already has", () => {
    const dictionary = globalTranslations["pt-br"];

    it("sign-in still accepts a password created under the old rule", () => {
        expect(
            buildSignInSchema(dictionary).safeParse({
                email: EMAIL,
                password: EXISTING_AT_MINIMUM,
            }).success
        ).toBe(true);
    });

    it("account deletion still accepts a password created under the old rule", () => {
        expect(
            buildAccountDeletionSchema(dictionary).safeParse({
                currentPassword: EXISTING_AT_MINIMUM,
            }).success
        ).toBe(true);
    });

    it("no form accepts a password shorter than Firebase ever allowed", () => {
        const tooShort = "b".repeat(EXISTING_PASSWORD_MIN_LENGTH - 1);

        expect(
            buildSignInSchema(dictionary).safeParse({
                email: EMAIL,
                password: tooShort,
            }).success
        ).toBe(false);
        expect(
            buildAccountDeletionSchema(dictionary).safeParse({
                currentPassword: tooShort,
            }).success
        ).toBe(false);
    });
});
