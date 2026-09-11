import { globalTranslations } from "@repo/internationalization/translations/global";
import { describe, expect, it } from "vitest";
import { buildForgotPasswordSchema } from "@/app/[locale]/(unauthenticated)/forgot-password/validations/forgotPasswordSchema";
import { buildResetPasswordSchema } from "@/app/[locale]/(unauthenticated)/reset-password/validations/resetPasswordSchema";
import { buildSignInSchema } from "@/app/[locale]/(unauthenticated)/sign-in/validations/signInSchema";
import { buildSignUpSchema } from "@/app/[locale]/(unauthenticated)/sign-up/validations/signUpSchema";

const dictionary = globalTranslations["pt-br"];

describe("buildSignInSchema", () => {
    const schema = buildSignInSchema(dictionary);

    it("accepts valid credentials", () => {
        expect(
            schema.safeParse({
                email: "user@example.com",
                password: "secret1",
            }).success
        ).toBe(true);
    });

    it("rejects an invalid email", () => {
        expect(
            schema.safeParse({ email: "nope", password: "secret1" }).success
        ).toBe(false);
    });

    it("rejects a short password", () => {
        expect(
            schema.safeParse({ email: "user@example.com", password: "123" })
                .success
        ).toBe(false);
    });
});

describe("buildSignUpSchema", () => {
    const schema = buildSignUpSchema(dictionary);

    it("accepts matching passwords", () => {
        expect(
            schema.safeParse({
                email: "user@example.com",
                password: "secret1",
                confirmPassword: "secret1",
            }).success
        ).toBe(true);
    });

    it("rejects mismatched passwords", () => {
        const result = schema.safeParse({
            email: "user@example.com",
            password: "secret1",
            confirmPassword: "secret2",
        });
        expect(result.success).toBe(false);
    });
});

describe("buildForgotPasswordSchema", () => {
    const schema = buildForgotPasswordSchema(dictionary);

    it("accepts an address, surrounding blanks included", () => {
        const result = schema.safeParse({ email: "  user@example.com  " });

        expect(result.success).toBe(true);
        expect(result.data?.email).toBe("user@example.com");
    });

    it.each(["", "   ", "nope", "user@", "@example.com"])(
        "rejects %j",
        (email) => {
            expect(schema.safeParse({ email }).success).toBe(false);
        }
    );

    it("answers with the copy from the dictionary", () => {
        const result = schema.safeParse({ email: "nope" });

        expect(result.error?.issues[0]?.message).toBe(
            dictionary.apps.app.pages.forgotPassword.validation.emailInvalid
        );
    });
});

describe("buildResetPasswordSchema", () => {
    const schema = buildResetPasswordSchema(dictionary);

    it("accepts matching passwords at the minimum length", () => {
        expect(
            schema.safeParse({
                password: "secret",
                confirmPassword: "secret",
            }).success
        ).toBe(true);
    });

    it("rejects a password below the minimum", () => {
        expect(
            schema.safeParse({ password: "12345", confirmPassword: "12345" })
                .success
        ).toBe(false);
    });

    it("blames the confirmation field when the two differ", () => {
        const result = schema.safeParse({
            password: "secret1",
            confirmPassword: "secret2",
        });

        expect(result.success).toBe(false);
        expect(result.error?.issues[0]?.path).toEqual(["confirmPassword"]);
        expect(result.error?.issues[0]?.message).toBe(
            dictionary.apps.app.pages.resetPassword.validation
                .passwordsDoNotMatch
        );
    });
});
