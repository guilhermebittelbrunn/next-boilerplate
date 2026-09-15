import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { identitySignInWithPassword } from "@/(shared)/lib/firebase-identity-toolkit";

vi.mock("server-only", () => ({}));

const okResponse = () =>
    Promise.resolve(
        new Response(
            JSON.stringify({
                localId: "uid",
                idToken: "id",
                refreshToken: "refresh",
                expiresIn: "3600",
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        )
    );

const MISSING_KEY_MESSAGE = /FIREBASE_WEB_API_KEY/;

let fetchMock: ReturnType<typeof vi.fn>;

const calledUrl = () => String(fetchMock.mock.calls[0]?.[0]);

beforeEach(() => {
    fetchMock = vi.fn(okResponse);
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", undefined);
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST", undefined);
    vi.stubEnv("FIREBASE_WEB_API_KEY", undefined);
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", undefined);
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
});

describe("identity toolkit base url", () => {
    it("calls Google directly when no emulator is configured", async () => {
        vi.stubEnv("FIREBASE_WEB_API_KEY", "real-key");

        await identitySignInWithPassword("a@b.com", "secret");

        expect(calledUrl()).toBe(
            "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=real-key"
        );
    });

    // The emulator serves the same REST API under the production host repeated as a path.
    it("routes through the emulator when the host is set", async () => {
        vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", "127.0.0.1:9099");
        vi.stubEnv("FIREBASE_WEB_API_KEY", "real-key");

        await identitySignInWithPassword("a@b.com", "secret");

        expect(calledUrl()).toBe(
            "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=real-key"
        );
    });

    it("ignores an empty emulator host and goes to Google", async () => {
        vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", "");
        vi.stubEnv("FIREBASE_WEB_API_KEY", "real-key");

        await identitySignInWithPassword("a@b.com", "secret");

        expect(calledUrl()).toContain("https://identitytoolkit.googleapis.com");
    });
});

describe("web api key", () => {
    it("substitutes a placeholder key when emulating", async () => {
        vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", "127.0.0.1:9099");

        await identitySignInWithPassword("a@b.com", "secret");

        expect(calledUrl()).toContain("key=demo-api-key");
    });

    it("still refuses to run without a key against the real Firebase", async () => {
        await expect(
            identitySignInWithPassword("a@b.com", "secret")
        ).rejects.toThrow(MISSING_KEY_MESSAGE);
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
