import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@repo/auth/server", () => ({
    createSessionCookie: vi.fn(),
    decodeSessionCookie: vi.fn(),
    verifyIdTokenClaims: vi.fn(),
}));

const { sessionDocId, sessionKeyFromClaims } = await import(
    "@/(shared)/lib/session-key"
);

const ORIGIN_SECONDS = 1_790_500_000;
const LATER_SECONDS = 1_790_800_000;
const FRACTION_OF_A_SECOND = 0.75;

describe("sessionKeyFromClaims", () => {
    it("prefere a origem carregada pelo SSO ao auth_time reescrito", () => {
        expect(
            sessionKeyFromClaims({
                auth_time: LATER_SECONDS,
                sessionAuthTime: ORIGIN_SECONDS,
            })
        ).toBe(String(ORIGIN_SECONDS));
    });

    it("usa o auth_time sem a claim do SSO", () => {
        expect(sessionKeyFromClaims({ auth_time: LATER_SECONDS })).toBe(
            String(LATER_SECONDS)
        );
    });

    it("descarta fração de segundo, para a chave caber num id", () => {
        expect(
            sessionKeyFromClaims({
                auth_time: ORIGIN_SECONDS + FRACTION_OF_A_SECOND,
            })
        ).toBe(String(ORIGIN_SECONDS));
    });

    it("devolve null quando nenhuma das duas é legível", () => {
        expect(sessionKeyFromClaims({})).toBeNull();
        expect(sessionKeyFromClaims({ auth_time: "yesterday" })).toBeNull();
    });
});

describe("sessionDocId", () => {
    it("escapa a barra, que o Firebase aceita no uid e o Firestore não aceita no id", () => {
        const id = sessionDocId("tenant/uid-1", String(ORIGIN_SECONDS));

        expect(id).toBe(`tenant%2Fuid-1_${ORIGIN_SECONDS}`);
        expect(id).not.toContain("/");
    });
});
