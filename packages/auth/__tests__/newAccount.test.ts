import type { UserCredential } from "firebase/auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAdditionalUserInfoMock } = vi.hoisted(() => ({
    getAdditionalUserInfoMock: vi.fn(),
}));

vi.mock("firebase/app", () => ({
    getApps: () => [{ name: "existing" }],
    initializeApp: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
    connectAuthEmulator: vi.fn(),
    getAdditionalUserInfo: (...args: unknown[]) =>
        getAdditionalUserInfoMock(...args),
    getAuth: vi.fn(),
    GoogleAuthProvider: class {},
    linkWithPopup: vi.fn(),
    onAuthStateChanged: vi.fn(),
    onIdTokenChanged: vi.fn(),
    reauthenticateWithPopup: vi.fn(),
    reload: vi.fn(),
    signInWithCustomToken: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    signInWithEmailLink: vi.fn(),
    signInWithPopup: vi.fn(),
    signOut: vi.fn(),
}));

const { isNewAccount } = await import("../client");

const CREDENTIAL = {
    user: { uid: "google-uid" },
    providerId: "google.com",
    operationType: "signIn",
} as unknown as UserCredential;

beforeEach(() => {
    getAdditionalUserInfoMock.mockReset();
});

describe("isNewAccount", () => {
    it("is true when the popup created the account", () => {
        getAdditionalUserInfoMock.mockReturnValue({ isNewUser: true });

        expect(isNewAccount(CREDENTIAL)).toBe(true);
        expect(getAdditionalUserInfoMock).toHaveBeenCalledWith(CREDENTIAL);
    });

    it("is false when the account already existed", () => {
        getAdditionalUserInfoMock.mockReturnValue({ isNewUser: false });

        expect(isNewAccount(CREDENTIAL)).toBe(false);
    });

    it("is false when Firebase has no additional information for the credential", () => {
        getAdditionalUserInfoMock.mockReturnValue(null);

        expect(isNewAccount(CREDENTIAL)).toBe(false);
    });
});
