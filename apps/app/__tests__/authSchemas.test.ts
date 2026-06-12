import { globalTranslations } from "@repo/internationalization/translations/global";
import { describe, expect, it } from "vitest";
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
