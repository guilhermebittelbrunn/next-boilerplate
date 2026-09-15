import type { UserRecord } from "firebase-admin/auth";
import { describe, expect, it } from "vitest";
import { mergeAuthAndFirestore } from "@/(shared)/mappers/user.mapper";

function authRecord(overrides: Record<string, unknown> = {}): UserRecord {
    return {
        uid: "auth-uid-1",
        email: "owner@example.com",
        emailVerified: true,
        displayName: "QA Common",
        photoURL: null,
        phoneNumber: null,
        disabled: false,
        metadata: {
            creationTime: "Mon, 01 Jan 2024 00:00:00 GMT",
            lastSignInTime: null,
            lastRefreshTime: null,
        },
        providerData: [],
        customClaims: null,
        tokensValidAfterTime: undefined,
        ...overrides,
    } as unknown as UserRecord;
}

const ACCOUNT_DOCUMENT = {
    id: "profile-1",
    reference_id: "auth-uid-1",
    phone: "+55 51 99999-0000",
    avatar: "uploads/auth-uid-1/9f1c8e30-4b7a-4c21-9f2a-3c5b0d8e1a44.webp",
    preferences: { theme: "dark", locale: "es" },
};

describe("payload da conta — campos do Firestore não são sombreados pelo Firebase Auth", () => {
    it("preserva phone, avatar e preferences ao lado dos campos do Auth", () => {
        const merged = mergeAuthAndFirestore(authRecord(), ACCOUNT_DOCUMENT);

        expect(merged.phone).toBe(ACCOUNT_DOCUMENT.phone);
        expect(merged.avatar).toBe(ACCOUNT_DOCUMENT.avatar);
        expect(merged.preferences).toEqual(ACCOUNT_DOCUMENT.preferences);
    });

    it("mantém phone e avatar mesmo quando o Auth traz phoneNumber e photoURL próprios", () => {
        const merged = mergeAuthAndFirestore(
            authRecord({
                phoneNumber: "+5551000000000",
                photoURL: "https://auth.example.com/avatar.png",
            }),
            ACCOUNT_DOCUMENT
        );

        expect(merged.phone).toBe(ACCOUNT_DOCUMENT.phone);
        expect(merged.avatar).toBe(ACCOUNT_DOCUMENT.avatar);
        expect(merged.phoneNumber).toBe("+5551000000000");
        expect(merged.photoURL).toBe("https://auth.example.com/avatar.png");
    });

    it("deixa o displayName do Auth vencer uma cópia velha no documento", () => {
        const merged = mergeAuthAndFirestore(authRecord(), {
            ...ACCOUNT_DOCUMENT,
            displayName: "Nome antigo",
        });

        expect(merged.displayName).toBe("QA Common");
    });

    it("não deixa o documento forjar os campos de identidade do Auth", () => {
        const merged = mergeAuthAndFirestore(authRecord(), {
            ...ACCOUNT_DOCUMENT,
            uid: "someone-else",
            email: "attacker@example.com",
            emailVerified: false,
            disabled: true,
            customClaims: { role: "admin" },
        });

        expect(merged.uid).toBe("auth-uid-1");
        expect(merged.email).toBe("owner@example.com");
        expect(merged.emailVerified).toBe(true);
        expect(merged.disabled).toBe(false);
        expect(merged.customClaims).toBeNull();
    });
});
