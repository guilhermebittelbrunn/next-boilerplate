import { beforeEach, describe, expect, it, vi } from "vitest";

const { verifyIdTokenClaimsMock } = vi.hoisted(() => ({
    verifyIdTokenClaimsMock: vi.fn(),
}));

vi.mock("@repo/auth/server", () => ({
    verifyIdTokenClaims: (...args: unknown[]) =>
        verifyIdTokenClaimsMock(...args),
}));

const { isRecentGoogleSignIn, RECENT_SIGN_IN_MAX_AGE_SECONDS } = await import(
    "@/(shared)/lib/recent-google-sign-in"
);

const UID = "user-1";
const NOW_SECONDS = 1_800_000_000;
const MILLISECONDS_IN_A_SECOND = 1000;
const NOW_MS = NOW_SECONDS * MILLISECONDS_IN_A_SECOND;
const ONE_SECOND = 1;

function claims(overrides: Record<string, unknown> = {}) {
    return {
        uid: UID,
        auth_time: NOW_SECONDS - 10,
        firebase: { sign_in_provider: "google.com" },
        ...overrides,
    };
}

beforeEach(() => {
    verifyIdTokenClaimsMock.mockReset();
});

describe("isRecentGoogleSignIn", () => {
    it("aceita um login Google de 299 segundos atrás", async () => {
        verifyIdTokenClaimsMock.mockResolvedValue(
            claims({
                auth_time:
                    NOW_SECONDS - (RECENT_SIGN_IN_MAX_AGE_SECONDS - ONE_SECOND),
            })
        );

        expect(await isRecentGoogleSignIn("token", UID, NOW_MS)).toBe(true);
        expect(verifyIdTokenClaimsMock).toHaveBeenCalledWith("token");
    });

    it("aceita exatamente no limite da janela", async () => {
        verifyIdTokenClaimsMock.mockResolvedValue(
            claims({ auth_time: NOW_SECONDS - RECENT_SIGN_IN_MAX_AGE_SECONDS })
        );

        expect(await isRecentGoogleSignIn("token", UID, NOW_MS)).toBe(true);
    });

    it("recusa um login Google de 301 segundos atrás", async () => {
        verifyIdTokenClaimsMock.mockResolvedValue(
            claims({
                auth_time:
                    NOW_SECONDS - (RECENT_SIGN_IN_MAX_AGE_SECONDS + ONE_SECOND),
            })
        );

        expect(await isRecentGoogleSignIn("token", UID, NOW_MS)).toBe(false);
    });

    it("recusa um token cunhado pelo bootstrap da sessão (provedor custom)", async () => {
        verifyIdTokenClaimsMock.mockResolvedValue(
            claims({ firebase: { sign_in_provider: "custom" } })
        );

        expect(await isRecentGoogleSignIn("token", UID, NOW_MS)).toBe(false);
    });

    it("recusa um token de login com senha", async () => {
        verifyIdTokenClaimsMock.mockResolvedValue(
            claims({ firebase: { sign_in_provider: "password" } })
        );

        expect(await isRecentGoogleSignIn("token", UID, NOW_MS)).toBe(false);
    });

    it("recusa um token de outra conta", async () => {
        verifyIdTokenClaimsMock.mockResolvedValue(
            claims({ uid: "someone-else" })
        );

        expect(await isRecentGoogleSignIn("token", UID, NOW_MS)).toBe(false);
    });

    it("recusa um token que não passa na verificação", async () => {
        verifyIdTokenClaimsMock.mockResolvedValue(null);

        expect(await isRecentGoogleSignIn("token", UID, NOW_MS)).toBe(false);
    });

    it("recusa um token sem auth_time", async () => {
        verifyIdTokenClaimsMock.mockResolvedValue(
            claims({ auth_time: undefined })
        );

        expect(await isRecentGoogleSignIn("token", UID, NOW_MS)).toBe(false);
    });

    it("recusa um auth_time no futuro", async () => {
        verifyIdTokenClaimsMock.mockResolvedValue(
            claims({ auth_time: NOW_SECONDS + 60 })
        );

        expect(await isRecentGoogleSignIn("token", UID, NOW_MS)).toBe(false);
    });
});
