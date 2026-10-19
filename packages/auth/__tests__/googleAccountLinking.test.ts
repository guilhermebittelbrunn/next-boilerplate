import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const { authState, linkWithPopupMock, reauthenticateWithPopupMock } =
    vi.hoisted(() => ({
        authState: { currentUser: null as unknown },
        linkWithPopupMock: vi.fn(),
        reauthenticateWithPopupMock: vi.fn(),
    }));

vi.mock("firebase/app", () => ({
    getApps: () => [{ name: "existing" }],
    initializeApp: vi.fn(),
}));

class FakeGoogleAuthProvider {
    readonly providerId = "google.com";
}

vi.mock("firebase/auth", () => ({
    connectAuthEmulator: vi.fn(),
    getAuth: () => authState,
    GoogleAuthProvider: FakeGoogleAuthProvider,
    linkWithPopup: (...args: unknown[]) => linkWithPopupMock(...args),
    onAuthStateChanged: vi.fn(),
    onIdTokenChanged: vi.fn(),
    reauthenticateWithPopup: (...args: unknown[]) =>
        reauthenticateWithPopupMock(...args),
    reload: vi.fn(),
    signInWithCustomToken: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    signInWithPopup: vi.fn(),
    signOut: vi.fn(),
}));

vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", "api-key");
vi.stubEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "auth-domain");
vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "project-id");
vi.stubEnv("NEXT_PUBLIC_FIREBASE_APP_ID", "app-id");
vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", "");
vi.stubEnv("NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST", "");

const { linkGoogle, reauthenticateWithGoogle } = await import("../client");

const SIGNED_IN_USER = { uid: "user-1" };

afterAll(() => {
    vi.unstubAllEnvs();
});

beforeEach(() => {
    linkWithPopupMock.mockReset();
    reauthenticateWithPopupMock.mockReset();
    authState.currentUser = SIGNED_IN_USER;
});

describe("linkGoogle", () => {
    it("vincula o Google ao usuário conectado pelo popup", async () => {
        linkWithPopupMock.mockResolvedValue({ user: SIGNED_IN_USER });

        await linkGoogle();

        expect(linkWithPopupMock).toHaveBeenCalledWith(
            SIGNED_IN_USER,
            expect.any(FakeGoogleAuthProvider)
        );
    });

    it("lança sem usuário conectado e não abre o popup", () => {
        authState.currentUser = null;

        expect(() => linkGoogle()).toThrow("No signed-in user");
        expect(linkWithPopupMock).not.toHaveBeenCalled();
    });
});

describe("reauthenticateWithGoogle", () => {
    it("devolve o ID token emitido pela reautenticação", async () => {
        const getIdToken = vi.fn().mockResolvedValue("fresh-google-token");
        reauthenticateWithPopupMock.mockResolvedValue({
            user: { getIdToken },
        });

        const token = await reauthenticateWithGoogle();

        expect(reauthenticateWithPopupMock).toHaveBeenCalledWith(
            SIGNED_IN_USER,
            expect.any(FakeGoogleAuthProvider)
        );
        expect(token).toBe("fresh-google-token");
    });

    it("rejeita sem usuário conectado e não abre o popup", async () => {
        authState.currentUser = null;

        await expect(reauthenticateWithGoogle()).rejects.toThrow(
            "No signed-in user"
        );
        expect(reauthenticateWithPopupMock).not.toHaveBeenCalled();
    });

    it("propaga o erro do popup para quem chamou", async () => {
        reauthenticateWithPopupMock.mockRejectedValue(
            Object.assign(new Error("closed"), {
                code: "auth/popup-closed-by-user",
            })
        );

        await expect(reauthenticateWithGoogle()).rejects.toMatchObject({
            code: "auth/popup-closed-by-user",
        });
    });
});
