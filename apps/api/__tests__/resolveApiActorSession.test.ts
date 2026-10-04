import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Firebase is mocked at the Admin SDK, not at `@repo/auth/server`: the credential goes
 * through the real verification, and the only thing standing between an ended session
 * and the API is the session check. The emulator would not prove this — it checks
 * revocation by itself on every `verifyIdToken`, with or without our code.
 */
const {
    verifyIdTokenMock,
    verifySessionCookieMock,
    getUserMock,
    findByUidAndKeyMock,
    listByUidMock,
    createSeenMock,
    touchSeenMock,
} = vi.hoisted(() => ({
    verifyIdTokenMock: vi.fn(),
    verifySessionCookieMock: vi.fn(),
    getUserMock: vi.fn(),
    findByUidAndKeyMock: vi.fn(),
    listByUidMock: vi.fn(),
    createSeenMock: vi.fn(),
    touchSeenMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@repo/auth/keys", () => ({
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
    }),
}));
vi.mock("firebase-admin/firestore", () => ({ getFirestore: vi.fn() }));
vi.mock("firebase-admin/storage", () => ({ getStorage: vi.fn() }));
vi.mock("@/(shared)/repositories/session.repository", () => ({
    sessionRepository: {
        findByUidAndKey: (...args: unknown[]) => findByUidAndKeyMock(...args),
        listByUid: (...args: unknown[]) => listByUidMock(...args),
        createSeen: (...args: unknown[]) => createSeenMock(...args),
        touchSeen: (...args: unknown[]) => touchSeenMock(...args),
    },
}));

const { resolveApiActor, resolveApiCredential } = await import(
    "@/(shared)/lib/resolve-api-actor"
);

const UID = "uid-1";
const ORIGIN_SECONDS = 1_790_500_000;
const KEY = String(ORIGIN_SECONDS);
const MS_PER_SECOND = 1000;
const USER = { uid: UID, email: "owner@example.com", disabled: false };
const CLAIMS = { uid: UID, auth_time: ORIGIN_SECONDS };
const BROWSER_UA =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";

function invalidIdToken() {
    return Object.assign(new Error("not an id token"), {
        code: "auth/argument-error",
    });
}

function request({
    bearer,
    cookie,
}: {
    bearer?: string;
    cookie?: string;
}): NextRequest {
    return {
        headers: new Headers({
            "user-agent": BROWSER_UA,
            ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
        }),
        cookies: {
            get: (name: string) =>
                name === "access-token" && cookie
                    ? { value: cookie }
                    : undefined,
        },
    } as unknown as NextRequest;
}

function givenIdToken(): void {
    verifyIdTokenMock.mockResolvedValue(CLAIMS);
    verifySessionCookieMock.mockRejectedValue(
        Object.assign(new Error("not a cookie"), {
            code: "auth/argument-error",
        })
    );
}

function givenSessionCookie(): void {
    verifyIdTokenMock.mockRejectedValue(invalidIdToken());
    verifySessionCookieMock.mockResolvedValue(CLAIMS);
}

function sessionRecord(revokedAt: string | null) {
    return {
        id: `${UID}_${KEY}`,
        uid: UID,
        sessionKey: KEY,
        signedInAt: new Date(ORIGIN_SECONDS * MS_PER_SECOND).toISOString(),
        lastSeenAt: new Date().toISOString(),
        browser: "Chrome",
        os: "macOS",
        deviceType: "desktop",
        revokedAt,
        revokedReason: revokedAt ? "revoked" : null,
        othersRevokedBefore: null,
    };
}

const ENDED = sessionRecord("2026-09-30T12:00:00.000Z");
const ACTIVE = sessionRecord(null);

beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(vi.fn());
    getUserMock.mockResolvedValue(USER);
    listByUidMock.mockResolvedValue([]);
    createSeenMock.mockResolvedValue(undefined);
    touchSeenMock.mockResolvedValue(undefined);
});

describe("resolveApiActor — sessão encerrada noutro aparelho", () => {
    it("recusa o ID token de uma sessão encerrada", async () => {
        givenIdToken();
        findByUidAndKeyMock.mockResolvedValue(ENDED);

        await expect(
            resolveApiActor(request({ bearer: "id-token" }))
        ).resolves.toBeNull();
        expect(findByUidAndKeyMock).toHaveBeenCalledWith(UID, KEY);
    });

    it("recusa o cookie de sessão encerrada, como bearer do SSR", async () => {
        givenSessionCookie();
        findByUidAndKeyMock.mockResolvedValue(ENDED);

        await expect(
            resolveApiActor(request({ bearer: "session-cookie" }))
        ).resolves.toBeNull();
    });

    it("recusa o cookie de sessão encerrada, como cookie", async () => {
        givenSessionCookie();
        findByUidAndKeyMock.mockResolvedValue(ENDED);

        await expect(
            resolveApiActor(request({ cookie: "session-cookie" }))
        ).resolves.toBeNull();
    });

    it("diz ao chamador que a sessão foi encerrada, e não que é anônima", async () => {
        givenIdToken();
        findByUidAndKeyMock.mockResolvedValue(ENDED);

        await expect(
            resolveApiCredential(request({ bearer: "id-token" }))
        ).resolves.toEqual({ status: "revoked" });
    });
});

describe("resolveApiActor — sessão ativa", () => {
    it("devolve o usuário do ID token e rastreia a sessão pelo auth_time", async () => {
        givenIdToken();
        findByUidAndKeyMock.mockResolvedValue(ACTIVE);

        await expect(
            resolveApiActor(request({ bearer: "id-token" }))
        ).resolves.toEqual(USER);
        await expect(
            resolveApiCredential(request({ bearer: "id-token" }))
        ).resolves.toEqual({ status: "active", user: USER, sessionKey: KEY });
    });

    it("devolve o usuário do cookie", async () => {
        givenSessionCookie();
        findByUidAndKeyMock.mockResolvedValue(ACTIVE);

        await expect(
            resolveApiActor(request({ cookie: "session-cookie" }))
        ).resolves.toEqual(USER);
        expect(verifySessionCookieMock).toHaveBeenCalledWith(
            "session-cookie",
            true
        );
    });

    it("tenta o bearer como ID token antes de tentá-lo como cookie", async () => {
        givenSessionCookie();
        findByUidAndKeyMock.mockResolvedValue(ACTIVE);

        await resolveApiActor(request({ bearer: "session-cookie" }));

        expect(verifyIdTokenMock).toHaveBeenCalledWith("session-cookie");
        expect(verifySessionCookieMock).toHaveBeenCalledWith(
            "session-cookie",
            true
        );
        expect(verifyIdTokenMock.mock.invocationCallOrder[0]).toBeLessThan(
            verifySessionCookieMock.mock.invocationCallOrder[0]
        );
    });

    it("deixa passar a credencial sem chave derivável, sem rastrear", async () => {
        verifyIdTokenMock.mockResolvedValue({ uid: UID });

        await expect(
            resolveApiActor(request({ bearer: "id-token" }))
        ).resolves.toEqual(USER);
        expect(findByUidAndKeyMock).not.toHaveBeenCalled();
    });

    it("deixa passar quando o Firestore não responde à leitura da sessão", async () => {
        givenIdToken();
        findByUidAndKeyMock.mockRejectedValue(new Error("unavailable"));

        await expect(
            resolveApiActor(request({ bearer: "id-token" }))
        ).resolves.toEqual(USER);
    });

    it("não consulta sessão sem credencial", async () => {
        await expect(resolveApiActor(request({}))).resolves.toBeNull();
        await expect(resolveApiCredential(request({}))).resolves.toEqual({
            status: "anonymous",
        });
        expect(findByUidAndKeyMock).not.toHaveBeenCalled();
    });
});
