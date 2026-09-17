import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
    verifyIdTokenMock,
    verifySessionCookieMock,
    getUserMock,
    createSessionCookieMock,
    createCustomTokenMock,
    cookieSetMock,
    cookieGetMock,
} = vi.hoisted(() => ({
    verifyIdTokenMock: vi.fn(),
    verifySessionCookieMock: vi.fn(),
    getUserMock: vi.fn(),
    createSessionCookieMock: vi.fn(),
    createCustomTokenMock: vi.fn(),
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
    }),
}));

vi.mock("firebase-admin/firestore", () => ({ getFirestore: vi.fn() }));
vi.mock("firebase-admin/storage", () => ({ getStorage: vi.fn() }));
vi.mock("next/headers", () => ({
    cookies: () => Promise.resolve({ set: cookieSetMock, get: cookieGetMock }),
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const { customTokenPOST, sessionPOST, sessionRefreshPOST } = await import(
    "../session-routes"
);
const { SESSION_COOKIE_NAME } = await import("../session");

const MS_PER_SECOND = 1000;
const SECONDS_PER_DAY = 86_400;
const STATUS_OK = 200;
const STATUS_BAD_REQUEST = 400;
const STATUS_UNAUTHORIZED = 401;
const STATUS_FORBIDDEN = 403;
const NOW = Date.parse("2026-06-01T12:00:00.000Z");
const PAST_THRESHOLD_DAYS = 3;
const BEYOND_CAP_DAYS = 31;
const CARRIED_ORIGIN_DAYS = 10;
const ONE_CALL = 1;
const CLEARED_COOKIE_MAX_AGE = 0;
const NON_STRING_TOKEN = 1;
const UID = "uid-1";
const HOST = "app.example.com";
const COOKIE = "session-cookie";

function nowSeconds(): number {
    return NOW / MS_PER_SECOND;
}

function daysAgoSeconds(days: number): number {
    return nowSeconds() - days * SECONDS_PER_DAY;
}

function request({
    origin,
    body = { idToken: "id-token" },
    rawBody,
}: {
    origin?: string;
    body?: unknown;
    rawBody?: string;
} = {}): Request {
    return new Request(`http://${HOST}/api/auth/session/refresh`, {
        method: "POST",
        headers: {
            host: HOST,
            "content-type": "application/json",
            ...(origin ? { origin } : {}),
        },
        body: rawBody ?? JSON.stringify(body),
    });
}

function givenCookie(value: string | null): void {
    cookieGetMock.mockReturnValue(value ? { value } : undefined);
}

const clearedCookieCall = () =>
    [
        SESSION_COOKIE_NAME,
        "",
        expect.objectContaining({ maxAge: CLEARED_COOKIE_MAX_AGE }),
    ] as const;

beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(vi.fn());
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    process.env.SESSION_ABSOLUTE_MAX_AGE_DAYS = "";
    process.env.SESSION_COOKIE_MAX_AGE_DAYS = "";
    createSessionCookieMock.mockResolvedValue("new-cookie");
    getUserMock.mockResolvedValue({ uid: UID });
});

afterEach(() => {
    vi.useRealTimers();
});

describe("sessionRefreshPOST", () => {
    it("recusa origem cruzada sem falar com o Firebase", async () => {
        const res = await sessionRefreshPOST(
            request({ origin: "http://evil.example" })
        );

        expect(res.status).toBe(STATUS_FORBIDDEN);
        await expect(res.json()).resolves.toEqual({
            error: { code: "AUTH_FORBIDDEN_ORIGIN" },
        });
        expect(verifySessionCookieMock).not.toHaveBeenCalled();
        expect(cookieSetMock).not.toHaveBeenCalled();
    });

    it("recusa corpo que não é JSON", async () => {
        const res = await sessionRefreshPOST(request({ rawBody: "not-json" }));

        expect(res.status).toBe(STATUS_BAD_REQUEST);
        await expect(res.json()).resolves.toEqual({
            error: { code: "AUTH_MISSING_TOKEN" },
        });
        expect(verifySessionCookieMock).not.toHaveBeenCalled();
    });

    it("recusa corpo sem idToken string", async () => {
        const res = await sessionRefreshPOST(
            request({ body: { idToken: NON_STRING_TOKEN } })
        );

        expect(res.status).toBe(STATUS_BAD_REQUEST);
        await expect(res.json()).resolves.toEqual({
            error: { code: "AUTH_MISSING_TOKEN" },
        });
    });

    it("recusa quando não há cookie de sessão", async () => {
        givenCookie(null);

        const res = await sessionRefreshPOST(request());

        expect(res.status).toBe(STATUS_UNAUTHORIZED);
        await expect(res.json()).resolves.toEqual({
            error: { code: "AUTH_NO_SESSION" },
        });
        expect(verifySessionCookieMock).not.toHaveBeenCalled();
    });

    it("limpa o cookie que não verifica", async () => {
        givenCookie(COOKIE);
        verifySessionCookieMock.mockRejectedValue(
            Object.assign(new Error("expired"), {
                code: "auth/session-cookie-expired",
            })
        );

        const res = await sessionRefreshPOST(request());

        expect(res.status).toBe(STATUS_UNAUTHORIZED);
        await expect(res.json()).resolves.toEqual({
            error: { code: "AUTH_NO_SESSION" },
        });
        expect(cookieSetMock).toHaveBeenCalledWith(...clearedCookieCall());
    });

    it("não toca no provedor com um cookie recém-emitido", async () => {
        givenCookie(COOKIE);
        verifySessionCookieMock.mockResolvedValue({
            uid: UID,
            iat: nowSeconds(),
        });

        const res = await sessionRefreshPOST(request());

        expect(res.status).toBe(STATUS_OK);
        await expect(res.json()).resolves.toEqual({ refreshed: false });
        expect(verifySessionCookieMock).toHaveBeenCalledTimes(ONE_CALL);
        expect(verifySessionCookieMock).toHaveBeenCalledWith(COOKIE, false);
        expect(getUserMock).not.toHaveBeenCalled();
        expect(createSessionCookieMock).not.toHaveBeenCalled();
        expect(cookieSetMock).not.toHaveBeenCalled();
    });

    it("regrava o cookie passado do limiar, checando revogação", async () => {
        givenCookie(COOKIE);
        verifySessionCookieMock.mockResolvedValue({
            uid: UID,
            iat: daysAgoSeconds(PAST_THRESHOLD_DAYS),
        });
        verifyIdTokenMock.mockResolvedValue({
            uid: UID,
            auth_time: daysAgoSeconds(PAST_THRESHOLD_DAYS),
        });

        const res = await sessionRefreshPOST(request());

        expect(res.status).toBe(STATUS_OK);
        await expect(res.json()).resolves.toEqual({ refreshed: true });
        expect(verifySessionCookieMock).toHaveBeenCalledWith(COOKIE, true);
        expect(cookieSetMock).toHaveBeenCalledWith(
            SESSION_COOKIE_NAME,
            "new-cookie",
            expect.objectContaining({ httpOnly: true })
        );
    });

    it("limpa o cookie de uma sessão revogada em vez de ressuscitá-la", async () => {
        givenCookie(COOKIE);
        verifySessionCookieMock.mockImplementation(
            (_cookie: string, checkRevoked: boolean) => {
                if (checkRevoked) {
                    return Promise.reject(
                        Object.assign(new Error("revoked"), {
                            code: "auth/session-cookie-revoked",
                        })
                    );
                }
                return Promise.resolve({
                    uid: UID,
                    iat: daysAgoSeconds(PAST_THRESHOLD_DAYS),
                });
            }
        );

        const res = await sessionRefreshPOST(request());

        expect(res.status).toBe(STATUS_UNAUTHORIZED);
        await expect(res.json()).resolves.toEqual({
            error: { code: "AUTH_NO_SESSION" },
        });
        expect(createSessionCookieMock).not.toHaveBeenCalled();
        expect(cookieSetMock).toHaveBeenCalledWith(...clearedCookieCall());
    });

    it("recusa e limpa o cookie quando o teto absoluto estourou", async () => {
        givenCookie(COOKIE);
        verifySessionCookieMock.mockResolvedValue({
            uid: UID,
            iat: daysAgoSeconds(PAST_THRESHOLD_DAYS),
        });
        verifyIdTokenMock.mockResolvedValue({
            uid: UID,
            auth_time: daysAgoSeconds(BEYOND_CAP_DAYS),
        });

        const res = await sessionRefreshPOST(request());

        expect(res.status).toBe(STATUS_UNAUTHORIZED);
        await expect(res.json()).resolves.toEqual({
            error: { code: "AUTH_SESSION_EXPIRED" },
        });
        expect(createSessionCookieMock).not.toHaveBeenCalled();
        expect(cookieSetMock).toHaveBeenCalledWith(...clearedCookieCall());
    });

    it("mantém o cookie quando só o id token é recusado", async () => {
        givenCookie(COOKIE);
        verifySessionCookieMock.mockResolvedValue({
            uid: UID,
            iat: daysAgoSeconds(PAST_THRESHOLD_DAYS),
        });
        verifyIdTokenMock.mockRejectedValue(
            Object.assign(new Error("invalid"), {
                code: "auth/invalid-id-token",
            })
        );

        const res = await sessionRefreshPOST(request());

        expect(res.status).toBe(STATUS_UNAUTHORIZED);
        await expect(res.json()).resolves.toEqual({
            error: { code: "AUTH_INVALID_TOKEN" },
        });
        expect(cookieSetMock).not.toHaveBeenCalled();
    });
});

describe("sessionPOST — o teto não é contornável pelo login", () => {
    it("recusa e limpa o cookie quando o teto estourou", async () => {
        verifyIdTokenMock.mockResolvedValue({
            uid: UID,
            auth_time: daysAgoSeconds(BEYOND_CAP_DAYS),
        });

        const res = await sessionPOST(request());

        expect(res.status).toBe(STATUS_UNAUTHORIZED);
        await expect(res.json()).resolves.toEqual({
            error: { code: "AUTH_SESSION_EXPIRED" },
        });
        expect(createSessionCookieMock).not.toHaveBeenCalled();
        expect(cookieSetMock).toHaveBeenCalledWith(...clearedCookieCall());
    });

    it("grava o cookie de um login dentro do teto", async () => {
        verifyIdTokenMock.mockResolvedValue({
            uid: UID,
            auth_time: nowSeconds(),
        });

        const res = await sessionPOST(request());

        expect(res.status).toBe(STATUS_OK);
        await expect(res.json()).resolves.toEqual({ ok: true });
        expect(cookieSetMock).toHaveBeenCalledWith(
            SESSION_COOKIE_NAME,
            "new-cookie",
            expect.objectContaining({ httpOnly: true })
        );
    });
});

describe("customTokenPOST — o bootstrap de SSO carrega a origem", () => {
    it("repassa o auth_time original como claim do custom token", async () => {
        givenCookie(COOKIE);
        const originSeconds = daysAgoSeconds(PAST_THRESHOLD_DAYS);
        verifySessionCookieMock.mockResolvedValue({
            uid: UID,
            auth_time: originSeconds,
        });
        createCustomTokenMock.mockResolvedValue("custom-token");

        const res = await customTokenPOST();

        expect(res.status).toBe(STATUS_OK);
        await expect(res.json()).resolves.toEqual({ token: "custom-token" });
        expect(createCustomTokenMock).toHaveBeenCalledWith(UID, {
            sessionAuthTime: originSeconds,
        });
    });

    it("preserva a origem já carregada em vez do auth_time reescrito", async () => {
        givenCookie(COOKIE);
        const originSeconds = daysAgoSeconds(CARRIED_ORIGIN_DAYS);
        verifySessionCookieMock.mockResolvedValue({
            uid: UID,
            auth_time: nowSeconds(),
            sessionAuthTime: originSeconds,
        });
        createCustomTokenMock.mockResolvedValue("custom-token");

        await customTokenPOST();

        expect(createCustomTokenMock).toHaveBeenCalledWith(UID, {
            sessionAuthTime: originSeconds,
        });
    });

    it("recusa o bootstrap quando o teto já estourou", async () => {
        givenCookie(COOKIE);
        verifySessionCookieMock.mockResolvedValue({
            uid: UID,
            auth_time: daysAgoSeconds(BEYOND_CAP_DAYS),
        });

        const res = await customTokenPOST();

        expect(res.status).toBe(STATUS_UNAUTHORIZED);
        await expect(res.json()).resolves.toEqual({
            error: { code: "AUTH_SESSION_EXPIRED" },
        });
        expect(createCustomTokenMock).not.toHaveBeenCalled();
        expect(cookieSetMock).toHaveBeenCalledWith(...clearedCookieCall());
    });

    it("recusa quando não há sessão compartilhada", async () => {
        givenCookie(null);

        const res = await customTokenPOST();

        expect(res.status).toBe(STATUS_UNAUTHORIZED);
        await expect(res.json()).resolves.toEqual({
            error: { code: "AUTH_NO_SESSION" },
        });
        expect(createCustomTokenMock).not.toHaveBeenCalled();
    });
});
