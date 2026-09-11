import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    getUserByEmailMock,
    generatePasswordResetLinkMock,
    generateEmailVerificationLinkMock,
    isEmailEnabledMock,
} = vi.hoisted(() => ({
    getUserByEmailMock: vi.fn(),
    generatePasswordResetLinkMock: vi.fn(),
    generateEmailVerificationLinkMock: vi.fn(),
    isEmailEnabledMock: vi.fn(),
}));

vi.mock("@repo/auth/server", () => ({
    getAuthInstance: () => ({
        getUserByEmail: (...args: unknown[]) => getUserByEmailMock(...args),
        generatePasswordResetLink: (...args: unknown[]) =>
            generatePasswordResetLinkMock(...args),
        generateEmailVerificationLink: (...args: unknown[]) =>
            generateEmailVerificationLinkMock(...args),
    }),
}));

vi.mock("@repo/email", () => ({
    isEmailEnabled: () => isEmailEnabledMock(),
}));

vi.mock("@/env", () => ({
    env: { NEXT_PUBLIC_APP_URL: "https://app.example.com" },
}));

const EMAIL = "person@example.com";
const FIREBASE_LINK =
    "https://project.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=CODE-123&apiKey=key&lang=en";

function firebaseError(code: string, message = "firebase said no") {
    return Object.assign(new Error(message), { code });
}

beforeEach(() => {
    vi.clearAllMocks();
    isEmailEnabledMock.mockReturnValue(true);
    getUserByEmailMock.mockResolvedValue({ uid: "uid-1", email: EMAIL });
});

describe("buildAuthActionLink", () => {
    it("keeps only the action code and rebuilds the link against our own page", async () => {
        generatePasswordResetLinkMock.mockResolvedValue(FIREBASE_LINK);
        const { buildAuthActionLink } = await import(
            "@/(shared)/lib/auth-action-links"
        );

        const link = await buildAuthActionLink(
            "reset-password",
            EMAIL,
            "pt-br"
        );

        expect(link).toBe(
            "https://app.example.com/pt-br/reset-password?oobCode=CODE-123"
        );
        expect(generatePasswordResetLinkMock).toHaveBeenCalledWith(EMAIL);
    });

    it("never points at the Firebase hosted handler", async () => {
        generateEmailVerificationLinkMock.mockResolvedValue(FIREBASE_LINK);
        const { buildAuthActionLink } = await import(
            "@/(shared)/lib/auth-action-links"
        );

        const link = await buildAuthActionLink("verify-email", EMAIL, "es");

        expect(link).toBe(
            "https://app.example.com/es/verify-email?oobCode=CODE-123"
        );
        expect(link).not.toContain("firebaseapp.com");
    });

    it("escapes an action code carrying url characters", async () => {
        generatePasswordResetLinkMock.mockResolvedValue(
            "https://project.firebaseapp.com/__/auth/action?oobCode=a%2Bb%2Fc%3D"
        );
        const { buildAuthActionLink } = await import(
            "@/(shared)/lib/auth-action-links"
        );

        const link = await buildAuthActionLink("reset-password", EMAIL, "en");

        expect(link).toBe(
            "https://app.example.com/en/reset-password?oobCode=a%2Bb%2Fc%3D"
        );
    });

    it("answers null for an address with no account", async () => {
        getUserByEmailMock.mockRejectedValue(
            firebaseError("auth/user-not-found")
        );
        const { buildAuthActionLink } = await import(
            "@/(shared)/lib/auth-action-links"
        );

        await expect(
            buildAuthActionLink("reset-password", EMAIL, "en")
        ).resolves.toBeNull();
        expect(generatePasswordResetLinkMock).not.toHaveBeenCalled();
    });

    it("answers null for an address the provider will not mint a link for", async () => {
        // Firebase reports an address it cannot build a link for as an internal
        // assertion; answering null keeps the caller unable to tell it apart.
        generatePasswordResetLinkMock.mockRejectedValue(
            firebaseError(
                "auth/internal-error",
                "INTERNAL ASSERT FAILED: Unable to create the email action link"
            )
        );
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
            // silence the expected report
        });
        const { buildAuthActionLink } = await import(
            "@/(shared)/lib/auth-action-links"
        );

        await expect(
            buildAuthActionLink("reset-password", EMAIL, "en")
        ).resolves.toBeNull();
        expect(warnSpy).toHaveBeenCalledWith(
            "[auth-action-link] refused kind=reset-password code=auth/internal-error"
        );
        warnSpy.mockRestore();
    });

    it("keeps the address out of the refusal log", async () => {
        generatePasswordResetLinkMock.mockRejectedValue(
            firebaseError("auth/internal-error")
        );
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
            // silence the expected report
        });
        const { buildAuthActionLink } = await import(
            "@/(shared)/lib/auth-action-links"
        );

        await buildAuthActionLink("reset-password", EMAIL, "en");

        for (const [line] of warnSpy.mock.calls) {
            expect(String(line)).not.toContain(EMAIL);
        }
        warnSpy.mockRestore();
    });

    it("answers null when the generated link carries no action code", async () => {
        generatePasswordResetLinkMock.mockResolvedValue(
            "https://project.firebaseapp.com/__/auth/action?mode=resetPassword"
        );
        const { buildAuthActionLink } = await import(
            "@/(shared)/lib/auth-action-links"
        );

        await expect(
            buildAuthActionLink("reset-password", EMAIL, "en")
        ).resolves.toBeNull();
    });

    it("propagates a lookup failure that is not a missing account", async () => {
        getUserByEmailMock.mockRejectedValue(new Error("firestore down"));
        const { buildAuthActionLink } = await import(
            "@/(shared)/lib/auth-action-links"
        );

        await expect(
            buildAuthActionLink("reset-password", EMAIL, "en")
        ).rejects.toThrow("firestore down");
    });
});

describe("canSendAuthActionLink", () => {
    it("is true only when the mailer and the link base are both configured", async () => {
        const { canSendAuthActionLink } = await import(
            "@/(shared)/lib/auth-action-links"
        );

        expect(canSendAuthActionLink()).toBe(true);
    });

    it("is false without a mailer", async () => {
        isEmailEnabledMock.mockReturnValue(false);
        const { canSendAuthActionLink } = await import(
            "@/(shared)/lib/auth-action-links"
        );

        expect(canSendAuthActionLink()).toBe(false);
    });

    it("is false without a link base", async () => {
        vi.resetModules();
        vi.doMock("@/env", () => ({ env: { NEXT_PUBLIC_APP_URL: undefined } }));
        const { canSendAuthActionLink } = await import(
            "@/(shared)/lib/auth-action-links"
        );

        expect(canSendAuthActionLink()).toBe(false);
        vi.doUnmock("@/env");
        vi.resetModules();
    });
});
