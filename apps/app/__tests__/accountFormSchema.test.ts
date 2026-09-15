import { globalTranslations } from "@repo/internationalization/translations/global";
import { describe, expect, it } from "vitest";
import {
    buildAccountPasswordSchema,
    buildAccountPreferencesSchema,
    buildAccountProfileSchema,
} from "@/app/[locale]/(authenticated)/(common)/(pages)/account/(validations)/accountFormSchema";

const profileSchema = buildAccountProfileSchema(globalTranslations["pt-br"]);
const passwordSchema = buildAccountPasswordSchema(globalTranslations["pt-br"]);
const preferencesSchema = buildAccountPreferencesSchema();

const profileBase = { displayName: "Ana Souza", phone: "", avatar: "" };

describe("buildAccountProfileSchema", () => {
    it("accepts a filled profile", () => {
        expect(profileSchema.safeParse(profileBase).success).toBe(true);
    });

    it("requires a display name", () => {
        expect(
            profileSchema.safeParse({ ...profileBase, displayName: " " })
                .success
        ).toBe(false);
    });

    it("accepts a plausible phone and refuses letters", () => {
        expect(
            profileSchema.safeParse({
                ...profileBase,
                phone: "+55 (51) 99999-0000",
            }).success
        ).toBe(true);
        expect(
            profileSchema.safeParse({ ...profileBase, phone: "ligue já" })
                .success
        ).toBe(false);
    });

    it("accepts an image reference but refuses a javascript url", () => {
        expect(
            profileSchema.safeParse({
                ...profileBase,
                avatar: "https://cdn.example.com/a.png",
            }).success
        ).toBe(true);
        expect(
            profileSchema.safeParse({
                ...profileBase,
                avatar: "uploads/profile-1/9f1c8e30-4b7a-4c21-9f2a-3c5b0d8e1a44.webp",
            }).success
        ).toBe(true);
        expect(
            profileSchema.safeParse({
                ...profileBase,
                avatar: "javascript:alert(1)",
            }).success
        ).toBe(false);
    });
});

describe("buildAccountPasswordSchema", () => {
    it("requires the confirmation to match", () => {
        expect(
            passwordSchema.safeParse({
                currentPassword: "old-secret",
                password: "new-secret",
                confirmPassword: "new-secret",
            }).success
        ).toBe(true);
        expect(
            passwordSchema.safeParse({
                currentPassword: "old-secret",
                password: "new-secret",
                confirmPassword: "other-secret",
            }).success
        ).toBe(false);
    });

    it("requires at least six characters", () => {
        expect(
            passwordSchema.safeParse({
                currentPassword: "old-secret",
                password: "12345",
                confirmPassword: "12345",
            }).success
        ).toBe(false);
    });
});

describe("buildAccountPreferencesSchema", () => {
    it("only accepts the supported theme and locale", () => {
        expect(
            preferencesSchema.safeParse({ theme: "dark", locale: "es" }).success
        ).toBe(true);
        expect(
            preferencesSchema.safeParse({ theme: "neon", locale: "es" }).success
        ).toBe(false);
        expect(
            preferencesSchema.safeParse({ theme: "dark", locale: "fr" }).success
        ).toBe(false);
    });
});
