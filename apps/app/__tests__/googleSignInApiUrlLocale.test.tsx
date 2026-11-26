import {
    getDictionaryForLocale,
    LocaleProvider,
} from "@repo/internationalization/client";
import { removeCookie, setCookie } from "@repo/shared/utils/helpers/cookies";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
    params,
    signOutMock,
    credentialFromResultMock,
    signInWithGoogleMock,
    fetchMock,
} = vi.hoisted(() => ({
    params: { locale: "es" } as Record<string, string>,
    signOutMock: vi.fn(),
    credentialFromResultMock: vi.fn(),
    signInWithGoogleMock: vi.fn(),
    fetchMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
    useParams: () => params,
}));

vi.mock("@repo/auth/client", () => ({
    getAuthClient: () => ({ name: "auth-client" }),
    isNewAccount: () => false,
}));

vi.mock("firebase/auth", () => ({
    GoogleAuthProvider: class {
        readonly providerId = "google.com";

        static credentialFromResult(...args: unknown[]) {
            return credentialFromResultMock(...args);
        }
    },
    signInWithPopup: () => Promise.resolve({ user: { uid: "google-uid" } }),
    signOut: (...args: unknown[]) => signOutMock(...args),
}));

vi.mock("@/shared/lib/client", () => ({
    apiClient: {
        authApi: {
            signInWithGoogle: (...args: unknown[]) =>
                signInWithGoogleMock(...args),
        },
        setAuthorizationHeader: vi.fn(),
    },
}));

const { signInWithGoogleViaApi } = await import("@/shared/lib/googleSignInApi");

const ONE_HOUR_IN_SECONDS = 3600;

function sessionCopy(locale: string) {
    return getDictionaryForLocale(locale).dictionary.packages.auth.provider
        .session.notEstablished;
}

function renderPageInLocale(locale: string) {
    params.locale = locale;
    render(<LocaleProvider>{null}</LocaleProvider>);
}

beforeEach(() => {
    for (const mock of [
        signOutMock,
        credentialFromResultMock,
        signInWithGoogleMock,
        fetchMock,
    ]) {
        mock.mockReset();
    }
    signOutMock.mockResolvedValue(undefined);
    credentialFromResultMock.mockReturnValue({ idToken: "google-id-token" });
    signInWithGoogleMock.mockResolvedValue({
        session: { idToken: "session-id-token" },
        user: { uid: "google-uid" },
    });
    vi.stubGlobal("fetch", fetchMock);
    setCookie("x-locale", "en", ONE_HOUR_IN_SECONDS);
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    removeCookie("x-locale");
});

describe("signInWithGoogleViaApi follows the locale in the URL over the cookie", () => {
    it.each(["pt-br", "es"])(
        "rejects with the %s copy when the popup returns no Google ID token",
        async (locale) => {
            renderPageInLocale(locale);
            credentialFromResultMock.mockReturnValue(null);

            await expect(signInWithGoogleViaApi()).rejects.toThrow(
                sessionCopy(locale)
            );
        }
    );

    it.each(["pt-br", "es"])(
        "rejects with the %s copy when the API answers without a session token",
        async (locale) => {
            renderPageInLocale(locale);
            signInWithGoogleMock.mockResolvedValue({ session: {}, user: null });

            await expect(signInWithGoogleViaApi()).rejects.toThrow(
                sessionCopy(locale)
            );
            expect(fetchMock).not.toHaveBeenCalled();
        }
    );
});
