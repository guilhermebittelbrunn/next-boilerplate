import { beforeEach, describe, expect, it, vi } from "vitest";

const { verifyIdTokenMock, getUserMock, verifySessionCookieMock } = vi.hoisted(
    () => ({
        verifyIdTokenMock: vi.fn(),
        getUserMock: vi.fn(),
        verifySessionCookieMock: vi.fn(),
    })
);

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
        getUser: (...args: unknown[]) => getUserMock(...args),
        verifySessionCookie: (...args: unknown[]) =>
            verifySessionCookieMock(...args),
    }),
}));

vi.mock("firebase-admin/firestore", () => ({ getFirestore: vi.fn() }));
vi.mock("firebase-admin/storage", () => ({ getStorage: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const { getCurrentUser, getUserFromSessionCookie } = await import("../server");

const UID = "uid-1";
const REVOKED_AT = "Mon, 01 Jan 2024 12:00:00 GMT";
const MILLISECONDS_IN_A_SECOND = 1000;
const REVOKED_AT_SECONDS = Date.parse(REVOKED_AT) / MILLISECONDS_IN_A_SECOND;
const ONE_MINUTE_IN_SECONDS = 60;

function decodedToken(authTimeSeconds: number) {
    return { uid: UID, auth_time: authTimeSeconds };
}

function userRecord(tokensValidAfterTime?: string) {
    return { uid: UID, email: "owner@example.com", tokensValidAfterTime };
}

function firebaseError(code: string) {
    return Object.assign(new Error(code), { code });
}

describe("getCurrentUser — id token contra a revogação de sessões", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, "error").mockImplementation(vi.fn());
    });

    it("recusa um id token emitido antes da revogação", async () => {
        verifyIdTokenMock.mockResolvedValue(
            decodedToken(REVOKED_AT_SECONDS - ONE_MINUTE_IN_SECONDS)
        );
        getUserMock.mockResolvedValue(userRecord(REVOKED_AT));

        await expect(getCurrentUser("stale-id-token")).resolves.toBeNull();
    });

    it("aceita um id token emitido depois da revogação", async () => {
        verifyIdTokenMock.mockResolvedValue(
            decodedToken(REVOKED_AT_SECONDS + ONE_MINUTE_IN_SECONDS)
        );
        getUserMock.mockResolvedValue(userRecord(REVOKED_AT));

        await expect(getCurrentUser("fresh-id-token")).resolves.toEqual(
            userRecord(REVOKED_AT)
        );
    });

    it("aceita um id token emitido no mesmo segundo da revogação", async () => {
        verifyIdTokenMock.mockResolvedValue(decodedToken(REVOKED_AT_SECONDS));
        getUserMock.mockResolvedValue(userRecord(REVOKED_AT));

        await expect(getCurrentUser("borderline-id-token")).resolves.toEqual(
            userRecord(REVOKED_AT)
        );
    });

    it("aceita o token quando a conta nunca teve sessões revogadas", async () => {
        verifyIdTokenMock.mockResolvedValue(decodedToken(REVOKED_AT_SECONDS));
        getUserMock.mockResolvedValue(userRecord(undefined));

        await expect(getCurrentUser("id-token")).resolves.toEqual(
            userRecord(undefined)
        );
    });

    it("aceita o token quando a marca de revogação não é uma data legível", async () => {
        verifyIdTokenMock.mockResolvedValue(decodedToken(REVOKED_AT_SECONDS));
        getUserMock.mockResolvedValue(userRecord("not-a-date"));

        await expect(getCurrentUser("id-token")).resolves.toEqual(
            userRecord("not-a-date")
        );
    });

    it("não consulta o Firebase quando não há token", async () => {
        await expect(getCurrentUser(null)).resolves.toBeNull();
        expect(verifyIdTokenMock).not.toHaveBeenCalled();
    });

    it("devolve null sem registrar erro quando o token expirou", async () => {
        verifyIdTokenMock.mockRejectedValue(
            firebaseError("auth/id-token-expired")
        );

        await expect(getCurrentUser("expired")).resolves.toBeNull();
        expect(console.error).not.toHaveBeenCalled();
    });
});

describe("getUserFromSessionCookie", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, "error").mockImplementation(vi.fn());
    });

    it("verifica o cookie pedindo a checagem de revogação ao Firebase", async () => {
        verifySessionCookieMock.mockResolvedValue({ uid: UID });
        getUserMock.mockResolvedValue(userRecord(REVOKED_AT));

        await getUserFromSessionCookie("session-cookie");

        expect(verifySessionCookieMock).toHaveBeenCalledWith(
            "session-cookie",
            true
        );
    });

    it("devolve null quando o cookie foi revogado", async () => {
        verifySessionCookieMock.mockRejectedValue(
            firebaseError("auth/session-cookie-revoked")
        );

        await expect(
            getUserFromSessionCookie("session-cookie")
        ).resolves.toBeNull();
        expect(console.error).not.toHaveBeenCalled();
    });
});
