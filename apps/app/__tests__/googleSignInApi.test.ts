import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
    authClient,
    signInWithPopupMock,
    signOutMock,
    credentialFromResultMock,
    signInWithGoogleMock,
    setAuthorizationHeaderMock,
} = vi.hoisted(() => ({
    authClient: { name: "auth-client" },
    signInWithPopupMock: vi.fn(),
    signOutMock: vi.fn(),
    credentialFromResultMock: vi.fn(),
    signInWithGoogleMock: vi.fn(),
    setAuthorizationHeaderMock: vi.fn(),
}));

vi.mock("@repo/auth/client", () => ({
    getAuthClient: () => authClient,
}));

vi.mock("firebase/auth", () => ({
    GoogleAuthProvider: class {
        readonly providerId = "google.com";

        static credentialFromResult(...args: unknown[]) {
            return credentialFromResultMock(...args);
        }
    },
    signInWithPopup: (...args: unknown[]) => signInWithPopupMock(...args),
    signOut: (...args: unknown[]) => signOutMock(...args),
}));

vi.mock("@/shared/lib/client", () => ({
    apiClient: {
        authApi: {
            signInWithGoogle: (...args: unknown[]) =>
                signInWithGoogleMock(...args),
        },
        setAuthorizationHeader: (...args: unknown[]) =>
            setAuthorizationHeaderMock(...args),
    },
}));

const { signInWithGoogleViaApi } = await import("@/shared/lib/googleSignInApi");

const SESSION = {
    idToken: "session-id-token",
    refreshToken: "refresh-token",
    expiresIn: "3600",
};
const STATUS_OK = 200;
const STATUS_UNAUTHORIZED = 401;

const fetchMock = vi.fn();

beforeEach(() => {
    for (const mock of [
        signInWithPopupMock,
        signOutMock,
        credentialFromResultMock,
        signInWithGoogleMock,
        setAuthorizationHeaderMock,
        fetchMock,
    ]) {
        mock.mockReset();
    }
    signInWithPopupMock.mockResolvedValue({ user: { uid: "google-uid" } });
    credentialFromResultMock.mockReturnValue({ idToken: "google-id-token" });
    signInWithGoogleMock.mockResolvedValue({
        session: SESSION,
        user: { uid: "google-uid" },
    });
    signOutMock.mockResolvedValue(undefined);
    fetchMock.mockResolvedValue({ ok: true, status: STATUS_OK });
    vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("signInWithGoogleViaApi", () => {
    it("keeps the Firebase client signed in when the API accepts the account", async () => {
        const result = await signInWithGoogleViaApi();

        expect(result.session).toEqual(SESSION);
        expect(setAuthorizationHeaderMock).toHaveBeenCalledWith(
            SESSION.idToken
        );
        expect(signOutMock).not.toHaveBeenCalled();
    });

    it("signs the popup user out and rethrows when the API refuses the account", async () => {
        const refusal = Object.assign(new Error("Request failed"), {
            response: {
                status: 404,
                data: { error: { code: "USERS_NOT_FOUND" } },
            },
        });
        signInWithGoogleMock.mockRejectedValue(refusal);

        await expect(signInWithGoogleViaApi()).rejects.toBe(refusal);
        expect(signOutMock).toHaveBeenCalledWith(authClient);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("signs the popup user out when the session cookie cannot be written", async () => {
        fetchMock.mockResolvedValue({ ok: false, status: STATUS_UNAUTHORIZED });

        await expect(signInWithGoogleViaApi()).rejects.toThrow(
            "Could not persist session"
        );
        expect(signOutMock).toHaveBeenCalledWith(authClient);
        expect(setAuthorizationHeaderMock).not.toHaveBeenCalled();
    });

    it("surfaces the API refusal even when signing out fails", async () => {
        const refusal = new Error("Request failed");
        signInWithGoogleMock.mockRejectedValue(refusal);
        signOutMock.mockRejectedValue(new Error("sign-out failed"));

        await expect(signInWithGoogleViaApi()).rejects.toBe(refusal);
    });

    it("does not sign out when the popup itself fails", async () => {
        signInWithPopupMock.mockRejectedValue(
            Object.assign(new Error("popup"), { code: "auth/user-disabled" })
        );

        await expect(signInWithGoogleViaApi()).rejects.toThrow("popup");
        expect(signOutMock).not.toHaveBeenCalled();
        expect(signInWithGoogleMock).not.toHaveBeenCalled();
    });
});
