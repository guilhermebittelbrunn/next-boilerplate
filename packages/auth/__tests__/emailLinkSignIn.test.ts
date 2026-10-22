import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { signInWithEmailLinkMock, authInstance } = vi.hoisted(() => ({
    signInWithEmailLinkMock: vi.fn(),
    authInstance: {
        app: { options: { apiKey: "web-api-key" as string | undefined } },
    },
}));

vi.mock("firebase/app", () => ({
    getApps: () => [{ name: "app" }],
    initializeApp: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
    connectAuthEmulator: vi.fn(),
    getAuth: () => authInstance,
    GoogleAuthProvider: class {},
    signInWithEmailLink: (...args: unknown[]) =>
        signInWithEmailLinkMock(...args),
}));

vi.mock("../emulator", () => ({
    authEmulatorOrigin: () => null,
    DEMO_PROJECT_ID: "demo",
    DEMO_WEB_API_KEY: "demo-key",
}));

const EMAIL = "person@example.com";
const PAGE = new URL(
    "https://app.example.com/pt-br/sign-in/email-link?oobCode=x"
);

function sentActionUrl(): URL {
    const [, , link] = signInWithEmailLinkMock.mock.calls[0] as [
        unknown,
        string,
        string,
    ];
    return new URL(link);
}

beforeEach(() => {
    vi.clearAllMocks();
    authInstance.app.options.apiKey = "web-api-key";
    signInWithEmailLinkMock.mockResolvedValue({ user: { uid: "uid-1" } });
    vi.stubGlobal("window", { location: PAGE });
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", "web-api-key");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "auth-domain");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "project-id");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_APP_ID", "app-id");
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
});

describe("signInWithEmailLinkCode", () => {
    it("hands the SDK a sign-in action url built on the current page", async () => {
        const { signInWithEmailLinkCode } = await import("../client");

        await signInWithEmailLinkCode({ email: EMAIL, oobCode: "CODE-1" });

        expect(signInWithEmailLinkMock).toHaveBeenCalledTimes(1);
        const [auth, email] = signInWithEmailLinkMock.mock.calls[0] as [
            unknown,
            string,
        ];
        expect(auth).toBe(authInstance);
        expect(email).toBe(EMAIL);

        const actionUrl = sentActionUrl();
        expect(actionUrl.origin).toBe("https://app.example.com");
        expect(actionUrl.pathname).toBe("/pt-br/sign-in/email-link");
        expect(actionUrl.searchParams.get("mode")).toBe("signIn");
        expect(actionUrl.searchParams.get("oobCode")).toBe("CODE-1");
        expect(actionUrl.searchParams.get("apiKey")).toBe("web-api-key");
    });

    it("keeps a code carrying url characters intact", async () => {
        const { signInWithEmailLinkCode } = await import("../client");
        const code = "a+b/c=d&mode=other";

        await signInWithEmailLinkCode({ email: EMAIL, oobCode: code });

        const actionUrl = sentActionUrl();
        expect(actionUrl.searchParams.get("oobCode")).toBe(code);
        expect(actionUrl.searchParams.getAll("mode")).toEqual(["signIn"]);
    });

    it("drops whatever the page query carried", async () => {
        const { signInWithEmailLinkCode } = await import("../client");

        await signInWithEmailLinkCode({ email: EMAIL, oobCode: "CODE-1" });

        expect(sentActionUrl().searchParams.getAll("oobCode")).toEqual([
            "CODE-1",
        ]);
    });

    it("passes the SDK refusal through to the caller", async () => {
        signInWithEmailLinkMock.mockRejectedValue(
            Object.assign(new Error("x"), { code: "auth/invalid-email" })
        );
        const { signInWithEmailLinkCode } = await import("../client");

        await expect(
            signInWithEmailLinkCode({ email: EMAIL, oobCode: "CODE-1" })
        ).rejects.toMatchObject({ code: "auth/invalid-email" });
    });
});
