import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionAuthority } from "../types";

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

const { customTokenPOST, sessionDELETE, sessionPOST, sessionRefreshPOST } =
    await import("../session-routes");
const { isSameOriginRequest } = await import("../session");

const HOST = "app.example.com";
const SAME_ORIGIN = `http://${HOST}`;
const STATUS_OK = 200;
const STATUS_BAD_REQUEST = 400;
const STATUS_UNAUTHORIZED = 401;
const STATUS_FORBIDDEN = 403;
const ID_TOKEN_MAX_LENGTH = 4096;
const MS_PER_SECOND = 1000;

type RequestShape = {
    origin?: string;
    secFetchSite?: string;
    method?: "POST" | "DELETE";
    body?: string;
};

function request({
    origin,
    secFetchSite,
    method = "POST",
    body = JSON.stringify({ idToken: "id-token" }),
}: RequestShape = {}): Request {
    return new Request(`${SAME_ORIGIN}/api/auth/session`, {
        method,
        headers: {
            host: HOST,
            "content-type": "application/json",
            ...(origin ? { origin } : {}),
            ...(secFetchSite ? { "sec-fetch-site": secFetchSite } : {}),
        },
        body: method === "DELETE" ? undefined : body,
    });
}

function authority() {
    return {
        check: vi.fn<SessionAuthority["check"]>(() =>
            Promise.resolve("active")
        ),
        end: vi.fn<SessionAuthority["end"]>(() => Promise.resolve()),
    } satisfies SessionAuthority;
}

function providerAndCookieCalls() {
    return {
        verifyIdToken: verifyIdTokenMock.mock.calls.length,
        verifySessionCookie: verifySessionCookieMock.mock.calls.length,
        createSessionCookie: createSessionCookieMock.mock.calls.length,
        createCustomToken: createCustomTokenMock.mock.calls.length,
        cookieRead: cookieGetMock.mock.calls.length,
        cookieWrite: cookieSetMock.mock.calls.length,
    };
}

const NO_PROVIDER_NOR_COOKIE_WORK = {
    verifyIdToken: 0,
    verifySessionCookie: 0,
    createSessionCookie: 0,
    createCustomToken: 0,
    cookieRead: 0,
    cookieWrite: 0,
};

beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "warn").mockImplementation(vi.fn());
    process.env.SESSION_ABSOLUTE_MAX_AGE_DAYS = "";
    process.env.SESSION_COOKIE_MAX_AGE_DAYS = "";
    verifyIdTokenMock.mockResolvedValue({
        uid: "uid-1",
        auth_time: Date.now() / MS_PER_SECOND,
    });
    createSessionCookieMock.mockResolvedValue("new-cookie");
});

describe("isSameOriginRequest", () => {
    it.each([
        ["Origin do mesmo host", { origin: SAME_ORIGIN }, true],
        [
            "Origin do mesmo host, qualquer Sec-Fetch-Site",
            { origin: SAME_ORIGIN, secFetchSite: "cross-site" },
            true,
        ],
        ["Origin de outro host", { origin: "http://evil.example" }, false],
        [
            "Origin de outro host com Sec-Fetch-Site same-origin",
            { origin: "http://evil.example", secFetchSite: "same-origin" },
            false,
        ],
        ["Origin malformado", { origin: "not a url" }, false],
        ["Origin null (string)", { origin: "null" }, false],
        [
            "sem Origin, Sec-Fetch-Site same-origin",
            { secFetchSite: "same-origin" },
            true,
        ],
        [
            "sem Origin, Sec-Fetch-Site same-site",
            { secFetchSite: "same-site" },
            false,
        ],
        [
            "sem Origin, Sec-Fetch-Site cross-site",
            { secFetchSite: "cross-site" },
            false,
        ],
        ["sem Origin, Sec-Fetch-Site none", { secFetchSite: "none" }, false],
        ["sem Origin nem Sec-Fetch-Site", {}, false],
    ] as const)("%s → %s", (_label, shape, expected) => {
        expect(isSameOriginRequest(request(shape))).toBe(expected);
    });
});

const ROUTES = [
    ["POST /api/auth/session", (req: Request) => sessionPOST(req, authority())],
    [
        "POST /api/auth/session/refresh",
        (req: Request) => sessionRefreshPOST(req, authority()),
    ],
    [
        "POST /api/auth/custom-token",
        (req: Request) => customTokenPOST(req, authority()),
    ],
    [
        "DELETE /api/auth/session",
        (req: Request) => sessionDELETE(req, authority()),
    ],
] as const;

describe.each(ROUTES)("%s recusa sem prova de mesma origem", (label, call) => {
    const method = label.startsWith("DELETE") ? "DELETE" : "POST";

    it.each([
        ["sem Origin nem Sec-Fetch-Site", {}],
        [
            "sem Origin, Sec-Fetch-Site cross-site",
            { secFetchSite: "cross-site" },
        ],
        ["Origin de outro host", { origin: "http://evil.example" }],
        ["Origin malformado", { origin: "not a url" }],
    ] as const)(
        "%s → 403 sem tocar no Firebase nem no cookie",
        async (_case, shape) => {
            const res = await call(request({ ...shape, method }));

            expect(res.status).toBe(STATUS_FORBIDDEN);
            await expect(res.json()).resolves.toEqual({
                error: { code: "AUTH_FORBIDDEN_ORIGIN" },
            });
            expect(providerAndCookieCalls()).toEqual(
                NO_PROVIDER_NOR_COOKIE_WORK
            );
        }
    );

    it("com Sec-Fetch-Site same-origin e sem Origin passa da checagem", async () => {
        const res = await call(
            request({ secFetchSite: "same-origin", method })
        );

        expect(res.status).not.toBe(STATUS_FORBIDDEN);
    });
});

describe("corpo das rotas de sessão validado com teto", () => {
    const BODY_CASES = [
        ["corpo vazio", ""],
        ["objeto sem idToken", JSON.stringify({})],
        ["idToken numérico", JSON.stringify({ idToken: 1 })],
        ["idToken vazio", JSON.stringify({ idToken: "" })],
        [
            "idToken acima do teto",
            JSON.stringify({ idToken: "a".repeat(ID_TOKEN_MAX_LENGTH + 1) }),
        ],
    ] as const;

    it.each(BODY_CASES)(
        "sessionPOST: %s → 400 AUTH_MISSING_TOKEN",
        async (_case, body) => {
            const res = await sessionPOST(
                request({ origin: SAME_ORIGIN, body })
            );

            expect(res.status).toBe(STATUS_BAD_REQUEST);
            await expect(res.json()).resolves.toEqual({
                error: { code: "AUTH_MISSING_TOKEN" },
            });
            expect(verifyIdTokenMock).not.toHaveBeenCalled();
        }
    );

    it.each(BODY_CASES)(
        "sessionRefreshPOST: %s → 400 AUTH_MISSING_TOKEN",
        async (_case, body) => {
            const res = await sessionRefreshPOST(
                request({ origin: SAME_ORIGIN, body })
            );

            expect(res.status).toBe(STATUS_BAD_REQUEST);
            await expect(res.json()).resolves.toEqual({
                error: { code: "AUTH_MISSING_TOKEN" },
            });
            expect(verifySessionCookieMock).not.toHaveBeenCalled();
            expect(verifyIdTokenMock).not.toHaveBeenCalled();
        }
    );

    it("um idToken exatamente no teto segue para o Firebase", async () => {
        const idToken = "a".repeat(ID_TOKEN_MAX_LENGTH);

        const res = await sessionPOST(
            request({ origin: SAME_ORIGIN, body: JSON.stringify({ idToken }) })
        );

        expect(res.status).toBe(STATUS_OK);
        expect(verifyIdTokenMock).toHaveBeenCalledWith(idToken);
    });

    it("campos extras no corpo continuam ignorados", async () => {
        const res = await sessionPOST(
            request({
                origin: SAME_ORIGIN,
                body: JSON.stringify({ idToken: "id-token", extra: true }),
            })
        );

        expect(res.status).toBe(STATUS_OK);
        expect(verifyIdTokenMock).toHaveBeenCalledWith("id-token");
    });

    it("um idToken que o Firebase recusa continua sendo 401, não 400", async () => {
        verifyIdTokenMock.mockRejectedValue(
            Object.assign(new Error("bad"), { code: "auth/invalid-id-token" })
        );

        const res = await sessionPOST(request({ origin: SAME_ORIGIN }));

        expect(res.status).toBe(STATUS_UNAUTHORIZED);
    });
});
