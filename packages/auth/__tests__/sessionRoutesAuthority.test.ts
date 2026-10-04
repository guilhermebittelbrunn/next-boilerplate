import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionAuthority, SessionStanding } from "../types";

const {
    verifyIdTokenMock,
    verifySessionCookieMock,
    getUserMock,
    createSessionCookieMock,
    createCustomTokenMock,
    revokeRefreshTokensMock,
    cookieSetMock,
    cookieGetMock,
} = vi.hoisted(() => ({
    verifyIdTokenMock: vi.fn(),
    verifySessionCookieMock: vi.fn(),
    getUserMock: vi.fn(),
    createSessionCookieMock: vi.fn(),
    createCustomTokenMock: vi.fn(),
    revokeRefreshTokensMock: vi.fn(),
    cookieSetMock: vi.fn(),
    cookieGetMock: vi.fn(),
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
        verifySessionCookie: (...args: unknown[]) =>
            verifySessionCookieMock(...args),
        getUser: (...args: unknown[]) => getUserMock(...args),
        createSessionCookie: (...args: unknown[]) =>
            createSessionCookieMock(...args),
        createCustomToken: (...args: unknown[]) =>
            createCustomTokenMock(...args),
        revokeRefreshTokens: (...args: unknown[]) =>
            revokeRefreshTokensMock(...args),
    }),
}));

vi.mock("firebase-admin/firestore", () => ({ getFirestore: vi.fn() }));
vi.mock("firebase-admin/storage", () => ({ getStorage: vi.fn() }));
vi.mock("next/headers", () => ({
    cookies: () => Promise.resolve({ set: cookieSetMock, get: cookieGetMock }),
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const { customTokenPOST, sessionDELETE, sessionPOST, sessionRefreshPOST } =
    await import("../session-routes");
const { SESSION_COOKIE_NAME } = await import("../session");

const MS_PER_SECOND = 1000;
const SECONDS_PER_DAY = 86_400;
const STATUS_OK = 200;
const STATUS_UNAUTHORIZED = 401;
const NOW = Date.parse("2026-06-01T12:00:00.000Z");
const PAST_THRESHOLD_DAYS = 3;
const CLEARED_COOKIE_MAX_AGE = 0;
const UID = "uid-1";
const HOST = "app.example.com";
const COOKIE = "session-cookie";
const ID_TOKEN = "id-token";
const BROWSER_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)";

function nowSeconds(): number {
    return NOW / MS_PER_SECOND;
}

function daysAgoSeconds(days: number): number {
    return nowSeconds() - days * SECONDS_PER_DAY;
}

function request(): Request {
    return new Request(`http://${HOST}/api/auth/session`, {
        method: "POST",
        headers: {
            host: HOST,
            "content-type": "application/json",
            "user-agent": BROWSER_UA,
        },
        body: JSON.stringify({ idToken: ID_TOKEN }),
    });
}

function givenCookie(value: string | null): void {
    cookieGetMock.mockReturnValue(value ? { value } : undefined);
}

function authorityAnswering(standing: SessionStanding) {
    const check = vi.fn<SessionAuthority["check"]>(() =>
        Promise.resolve(standing)
    );
    const end = vi.fn<SessionAuthority["end"]>(() => Promise.resolve());
    return { check, end } satisfies SessionAuthority;
}

const clearedCookieCall = () =>
    [
        SESSION_COOKIE_NAME,
        "",
        expect.objectContaining({ maxAge: CLEARED_COOKIE_MAX_AGE }),
    ] as const;

const writtenCookieCall = () =>
    [
        SESSION_COOKIE_NAME,
        "new-cookie",
        expect.objectContaining({ httpOnly: true }),
    ] as const;

/** What a refused write looks like from the outside, compared whole in each test. */
async function outcomeOf(res: Response) {
    return {
        status: res.status,
        body: await res.json(),
        minted: createSessionCookieMock.mock.calls.length > 0,
        cleared: cookieSetMock.mock.calls.some(
            ([name, value]) => name === SESSION_COOKIE_NAME && value === ""
        ),
        written: cookieSetMock.mock.calls.some(
            ([name, value]) =>
                name === SESSION_COOKIE_NAME && value === "new-cookie"
        ),
    };
}

const REVOKED_OUTCOME = {
    status: STATUS_UNAUTHORIZED,
    body: { error: { code: "AUTH_SESSION_REVOKED" } },
    minted: false,
    cleared: true,
    written: false,
};

function givenStaleCookie(): void {
    givenCookie(COOKIE);
    verifySessionCookieMock.mockResolvedValue({
        uid: UID,
        iat: daysAgoSeconds(PAST_THRESHOLD_DAYS),
        auth_time: daysAgoSeconds(PAST_THRESHOLD_DAYS),
    });
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(vi.fn());
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    process.env.SESSION_ABSOLUTE_MAX_AGE_DAYS = "";
    process.env.SESSION_COOKIE_MAX_AGE_DAYS = "";
    createSessionCookieMock.mockResolvedValue("new-cookie");
    createCustomTokenMock.mockResolvedValue("custom-token");
    getUserMock.mockResolvedValue({ uid: UID });
    verifyIdTokenMock.mockResolvedValue({ uid: UID, auth_time: nowSeconds() });
});

afterEach(() => {
    vi.useRealTimers();
});

describe("sessionPOST com a autoridade da API", () => {
    it("recusa gravar o cookie de uma sessão encerrada e limpa o atual", async () => {
        const authority = authorityAnswering("revoked");

        expect(
            await outcomeOf(await sessionPOST(request(), authority))
        ).toEqual(REVOKED_OUTCOME);
        expect(authority.check).toHaveBeenCalledWith(ID_TOKEN, BROWSER_UA);
    });

    it("grava o cookie de uma sessão ativa", async () => {
        const res = await sessionPOST(request(), authorityAnswering("active"));

        expect(res.status).toBe(STATUS_OK);
        expect(cookieSetMock).toHaveBeenCalledWith(...writtenCookieCall());
    });

    it("grava o cookie quando a API não responde", async () => {
        const res = await sessionPOST(request(), authorityAnswering("unknown"));

        expect(res.status).toBe(STATUS_OK);
        expect(cookieSetMock).toHaveBeenCalledWith(...writtenCookieCall());
    });

    it("grava o cookie sem autoridade, como antes", async () => {
        const res = await sessionPOST(request());

        expect(res.status).toBe(STATUS_OK);
        expect(cookieSetMock).toHaveBeenCalledWith(...writtenCookieCall());
    });
});

describe("sessionRefreshPOST com a autoridade da API", () => {
    it("não consulta a API no caminho quente", async () => {
        givenCookie(COOKIE);
        verifySessionCookieMock.mockResolvedValue({
            uid: UID,
            iat: nowSeconds(),
        });
        const authority = authorityAnswering("revoked");

        const res = await sessionRefreshPOST(request(), authority);

        await expect(res.json()).resolves.toEqual({ refreshed: false });
        expect(authority.check).not.toHaveBeenCalled();
    });

    it("recusa renovar uma sessão encerrada, consultando com o cookie atual", async () => {
        givenStaleCookie();
        const authority = authorityAnswering("revoked");

        expect(
            await outcomeOf(await sessionRefreshPOST(request(), authority))
        ).toEqual(REVOKED_OUTCOME);
        expect(authority.check).toHaveBeenCalledWith(COOKIE, BROWSER_UA);
    });

    it("renova uma sessão ativa ou quando a API não responde", async () => {
        for (const standing of ["active", "unknown"] as const) {
            cookieSetMock.mockClear();
            givenStaleCookie();

            const res = await sessionRefreshPOST(
                request(),
                authorityAnswering(standing)
            );

            await expect(res.json()).resolves.toEqual({ refreshed: true });
            expect(cookieSetMock).toHaveBeenCalledWith(...writtenCookieCall());
        }
    });
});

describe("customTokenPOST com a autoridade da API", () => {
    it("não emite custom token para uma sessão encerrada", async () => {
        givenStaleCookie();
        const authority = authorityAnswering("revoked");

        const res = await customTokenPOST(request(), authority);

        expect(res.status).toBe(STATUS_UNAUTHORIZED);
        await expect(res.json()).resolves.toEqual({
            error: { code: "AUTH_SESSION_REVOKED" },
        });
        expect(createCustomTokenMock).not.toHaveBeenCalled();
        expect(cookieSetMock).toHaveBeenCalledWith(...clearedCookieCall());
        expect(authority.check).toHaveBeenCalledWith(COOKIE, BROWSER_UA);
    });

    it("emite o custom token para uma sessão ativa ou sem resposta da API", async () => {
        for (const standing of ["active", "unknown"] as const) {
            givenStaleCookie();

            const res = await customTokenPOST(
                request(),
                authorityAnswering(standing)
            );

            await expect(res.json()).resolves.toEqual({
                token: "custom-token",
            });
        }
    });
});

describe("sessionDELETE — sai só deste navegador", () => {
    it("encerra a sessão na API e limpa o cookie sem revogar no Firebase", async () => {
        givenCookie(COOKIE);
        const authority = authorityAnswering("active");

        const res = await sessionDELETE(authority);

        expect(res.status).toBe(STATUS_OK);
        expect(authority.end).toHaveBeenCalledWith(COOKIE);
        expect(revokeRefreshTokensMock).not.toHaveBeenCalled();
        expect(cookieSetMock).toHaveBeenCalledWith(...clearedCookieCall());
    });

    it("limpa o cookie mesmo quando a API falha", async () => {
        givenCookie(COOKIE);
        const authority = authorityAnswering("active");
        authority.end.mockRejectedValue(new Error("api down"));

        const res = await sessionDELETE(authority);

        expect(res.status).toBe(STATUS_OK);
        expect(cookieSetMock).toHaveBeenCalledWith(...clearedCookieCall());
    });

    it("não chama a API sem cookie", async () => {
        givenCookie(null);
        const authority = authorityAnswering("active");

        await sessionDELETE(authority);

        expect(authority.end).not.toHaveBeenCalled();
        expect(cookieSetMock).toHaveBeenCalledWith(...clearedCookieCall());
    });

    it("sem autoridade, só limpa o cookie", async () => {
        givenCookie(COOKIE);

        await sessionDELETE();

        expect(revokeRefreshTokensMock).not.toHaveBeenCalled();
        expect(verifySessionCookieMock).not.toHaveBeenCalled();
        expect(cookieSetMock).toHaveBeenCalledWith(...clearedCookieCall());
    });
});
