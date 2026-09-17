import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { verifyIdTokenMock, createSessionCookieMock, cookieSetMock } =
    vi.hoisted(() => ({
        verifyIdTokenMock: vi.fn(),
        createSessionCookieMock: vi.fn(),
        cookieSetMock: vi.fn(),
    }));

vi.mock("server-only", () => ({}));

vi.mock("../keys", () => ({
    keys: () => ({
        FIREBASE_ADMIN_PROJECT_ID: "project",
        FIREBASE_ADMIN_CLIENT_EMAIL: "admin@project.iam.gserviceaccount.com",
        FIREBASE_ADMIN_PRIVATE_KEY: "private-key",
    }),
}));

vi.mock("firebase-admin/app", () => ({
    cert: vi.fn(),
    getApps: () => [{ name: "[DEFAULT]" }],
    initializeApp: vi.fn(),
}));

vi.mock("firebase-admin/auth", () => ({
    getAuth: () => ({
        verifyIdToken: (...args: unknown[]) => verifyIdTokenMock(...args),
        createSessionCookie: (...args: unknown[]) =>
            createSessionCookieMock(...args),
    }),
}));

vi.mock("firebase-admin/firestore", () => ({ getFirestore: vi.fn() }));
vi.mock("firebase-admin/storage", () => ({ getStorage: vi.fn() }));
vi.mock("next/headers", () => ({
    cookies: () => Promise.resolve({ set: cookieSetMock, get: vi.fn() }),
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const {
    getSessionAbsoluteMaxAgeMs,
    isWithinAbsoluteCap,
    mintSessionCookie,
    resolveSessionOriginSeconds,
    SESSION_COOKIE_NAME,
    shouldRefreshSession,
} = await import("../session");

const MS_PER_SECOND = 1000;
const SECONDS_PER_DAY = 86_400;
const MS_PER_DAY = SECONDS_PER_DAY * MS_PER_SECOND;
const DEFAULT_ABSOLUTE_DAYS = 30;
const MAX_ABSOLUTE_DAYS = 90;
const DEFAULT_COOKIE_DAYS = 5;
const SHORTEST_COOKIE_DAYS = 0.0035;
const NOW = Date.parse("2026-06-01T12:00:00.000Z");
const WITHIN_CAP_DAYS = 29;
const BEYOND_CAP_DAYS = 31;
const ONE_DAY = 1;
const PAST_THRESHOLD_DAYS = 3;
const CARRIED_ORIGIN_SECONDS = 1000;
const AUTH_TIME_SECONDS = 2000;
const HALF = 0.5;
const CAP_ABOVE_SHORTEST_COOKIE_DAYS = HALF;

function nowSeconds(): number {
    return NOW / MS_PER_SECOND;
}

function daysAgoSeconds(days: number): number {
    return nowSeconds() - days * SECONDS_PER_DAY;
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(vi.fn());
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    process.env.SESSION_ABSOLUTE_MAX_AGE_DAYS = "";
    process.env.SESSION_COOKIE_MAX_AGE_DAYS = "";
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
});

describe("getSessionAbsoluteMaxAgeMs", () => {
    it("usa 30 dias quando a variável está ausente", () => {
        vi.stubEnv("SESSION_ABSOLUTE_MAX_AGE_DAYS", undefined);
        expect(getSessionAbsoluteMaxAgeMs()).toBe(
            DEFAULT_ABSOLUTE_DAYS * MS_PER_DAY
        );
    });

    it("trata string vazia como ausência", () => {
        process.env.SESSION_ABSOLUTE_MAX_AGE_DAYS = "";
        expect(getSessionAbsoluteMaxAgeMs()).toBe(
            DEFAULT_ABSOLUTE_DAYS * MS_PER_DAY
        );
    });

    it.each(["abc", "0", "-3"])(
        "cai no default quando o valor é %s",
        (value) => {
            process.env.SESSION_ABSOLUTE_MAX_AGE_DAYS = value;
            expect(getSessionAbsoluteMaxAgeMs()).toBe(
                DEFAULT_ABSOLUTE_DAYS * MS_PER_DAY
            );
        }
    );

    it("grampeia em 90 dias um valor maior que o máximo", () => {
        process.env.SESSION_ABSOLUTE_MAX_AGE_DAYS = "400";
        expect(getSessionAbsoluteMaxAgeMs()).toBe(
            MAX_ABSOLUTE_DAYS * MS_PER_DAY
        );
    });

    it("usa a vida do cookie como piso", () => {
        process.env.SESSION_ABSOLUTE_MAX_AGE_DAYS = "1";
        expect(getSessionAbsoluteMaxAgeMs()).toBe(
            DEFAULT_COOKIE_DAYS * MS_PER_DAY
        );
    });

    it("aceita fração de dia acima da vida do cookie", () => {
        process.env.SESSION_COOKIE_MAX_AGE_DAYS = String(SHORTEST_COOKIE_DAYS);
        process.env.SESSION_ABSOLUTE_MAX_AGE_DAYS = String(
            CAP_ABOVE_SHORTEST_COOKIE_DAYS
        );
        expect(getSessionAbsoluteMaxAgeMs()).toBe(
            CAP_ABOVE_SHORTEST_COOKIE_DAYS * MS_PER_DAY
        );
    });
});

describe("resolveSessionOriginSeconds", () => {
    it("prefere a claim carregada pelo bootstrap de SSO", () => {
        expect(
            resolveSessionOriginSeconds({
                sessionAuthTime: CARRIED_ORIGIN_SECONDS,
                auth_time: AUTH_TIME_SECONDS,
            })
        ).toBe(CARRIED_ORIGIN_SECONDS);
    });

    it.each([["texto"], [Number.NaN]])(
        "ignora a claim inválida %s e cai em auth_time",
        (carried) => {
            expect(
                resolveSessionOriginSeconds({
                    sessionAuthTime: carried,
                    auth_time: AUTH_TIME_SECONDS,
                })
            ).toBe(AUTH_TIME_SECONDS);
        }
    );

    it("devolve null quando não há nenhuma das duas", () => {
        expect(resolveSessionOriginSeconds({ uid: "uid-1" })).toBeNull();
    });
});

describe("isWithinAbsoluteCap", () => {
    it("aceita quando a origem não é legível", () => {
        expect(isWithinAbsoluteCap(null)).toBe(true);
    });

    it("aceita uma autenticação dentro do teto", () => {
        expect(isWithinAbsoluteCap(daysAgoSeconds(WITHIN_CAP_DAYS))).toBe(true);
    });

    it("recusa uma autenticação além do teto", () => {
        expect(isWithinAbsoluteCap(daysAgoSeconds(BEYOND_CAP_DAYS))).toBe(
            false
        );
    });
});

describe("shouldRefreshSession", () => {
    it("recusa um cookie recém-emitido", () => {
        expect(shouldRefreshSession(nowSeconds())).toBe(false);
    });

    it("aceita um cookie passado da metade da vida", () => {
        expect(shouldRefreshSession(daysAgoSeconds(PAST_THRESHOLD_DAYS))).toBe(
            true
        );
    });

    it("aceita um cookie exatamente no limiar", () => {
        expect(
            shouldRefreshSession(daysAgoSeconds(DEFAULT_COOKIE_DAYS * HALF))
        ).toBe(true);
    });
});

describe("mintSessionCookie", () => {
    it("grava o cookie quando a autenticação está dentro do teto", async () => {
        verifyIdTokenMock.mockResolvedValue({
            uid: "uid-1",
            auth_time: daysAgoSeconds(ONE_DAY),
        });
        createSessionCookieMock.mockResolvedValue("minted-cookie");

        await expect(mintSessionCookie("id-token")).resolves.toEqual({
            ok: true,
        });
        expect(cookieSetMock).toHaveBeenCalledWith(
            SESSION_COOKIE_NAME,
            "minted-cookie",
            expect.objectContaining({
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                maxAge: (DEFAULT_COOKIE_DAYS * MS_PER_DAY) / MS_PER_SECOND,
            })
        );
    });

    it("recusa sem gravar quando o teto absoluto estourou", async () => {
        verifyIdTokenMock.mockResolvedValue({
            uid: "uid-1",
            auth_time: daysAgoSeconds(BEYOND_CAP_DAYS),
        });

        await expect(mintSessionCookie("id-token")).resolves.toEqual({
            ok: false,
            reason: "absolute-cap",
        });
        expect(createSessionCookieMock).not.toHaveBeenCalled();
        expect(cookieSetMock).not.toHaveBeenCalled();
    });

    it("conta o teto pela claim de origem, não pelo auth_time do custom token", async () => {
        verifyIdTokenMock.mockResolvedValue({
            uid: "uid-1",
            auth_time: nowSeconds(),
            sessionAuthTime: daysAgoSeconds(BEYOND_CAP_DAYS),
        });

        await expect(mintSessionCookie("id-token")).resolves.toEqual({
            ok: false,
            reason: "absolute-cap",
        });
        expect(cookieSetMock).not.toHaveBeenCalled();
    });

    it("recusa um id token que não verifica", async () => {
        verifyIdTokenMock.mockRejectedValue(
            Object.assign(new Error("expired"), {
                code: "auth/id-token-expired",
            })
        );

        await expect(mintSessionCookie("id-token")).resolves.toEqual({
            ok: false,
            reason: "invalid-token",
        });
        expect(cookieSetMock).not.toHaveBeenCalled();
    });

    it("recusa quando o provedor rejeita a emissão do cookie", async () => {
        verifyIdTokenMock.mockResolvedValue({
            uid: "uid-1",
            auth_time: daysAgoSeconds(ONE_DAY),
        });
        createSessionCookieMock.mockRejectedValue(new Error("refused"));

        await expect(mintSessionCookie("id-token")).resolves.toEqual({
            ok: false,
            reason: "invalid-token",
        });
        expect(cookieSetMock).not.toHaveBeenCalled();
    });
});
