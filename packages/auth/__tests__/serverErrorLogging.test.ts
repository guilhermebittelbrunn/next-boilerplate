import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    verifyIdTokenMock,
    getUserMock,
    verifySessionCookieMock,
    createCustomTokenMock,
    revokeRefreshTokensMock,
} = vi.hoisted(() => ({
    verifyIdTokenMock: vi.fn(),
    getUserMock: vi.fn(),
    verifySessionCookieMock: vi.fn(),
    createCustomTokenMock: vi.fn(),
    revokeRefreshTokensMock: vi.fn(),
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
        getUser: (...args: unknown[]) => getUserMock(...args),
        verifySessionCookie: (...args: unknown[]) =>
            verifySessionCookieMock(...args),
        createCustomToken: (...args: unknown[]) =>
            createCustomTokenMock(...args),
        revokeRefreshTokens: (...args: unknown[]) =>
            revokeRefreshTokensMock(...args),
    }),
}));

vi.mock("firebase-admin/firestore", () => ({ getFirestore: vi.fn() }));
vi.mock("firebase-admin/storage", () => ({ getStorage: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const {
    createCustomToken,
    decodeSessionCookie,
    getIdTokenSession,
    getSessionFromCookie,
    getUserById,
    revokeUserSessions,
    verifyIdTokenClaims,
} = await import("../server");

const LEAKY_EMAIL = "pessoa.ficticia@example.com";
const LEAKY_TOKEN = "eyJhbGciOiJSUzI1NiJ9.ficticio.assinatura"; // gitleaks:allow
const LEAKY_UID = "uid-ficticio-123";
const LEAKY_MESSAGE = `There is no user record for ${LEAKY_EMAIL} (${LEAKY_UID}) with token ${LEAKY_TOKEN}`;

function providerFailure(): Error {
    return Object.assign(new Error(LEAKY_MESSAGE), {
        code: "auth/internal-error",
    });
}

function codelessFailure(): Error {
    return new TypeError(LEAKY_MESSAGE);
}

type Scenario = {
    fn: string;
    event: string;
    arrange: (error: Error) => void;
    act: () => Promise<unknown>;
    rethrows?: boolean;
};

const SCENARIOS: Scenario[] = [
    {
        fn: "getIdTokenSession",
        event: "id-token-session-failed",
        arrange: (error) => verifyIdTokenMock.mockRejectedValue(error),
        act: () => getIdTokenSession(LEAKY_TOKEN),
    },
    {
        fn: "getUserById",
        event: "user-lookup-failed",
        arrange: (error) => getUserMock.mockRejectedValue(error),
        act: () => getUserById(LEAKY_UID),
    },
    {
        fn: "createCustomToken",
        event: "custom-token-failed",
        arrange: (error) => createCustomTokenMock.mockRejectedValue(error),
        act: () => createCustomToken(LEAKY_UID),
        rethrows: true,
    },
    {
        fn: "verifyIdTokenClaims",
        event: "id-token-verify-failed",
        arrange: (error) => verifyIdTokenMock.mockRejectedValue(error),
        act: () => verifyIdTokenClaims(LEAKY_TOKEN),
    },
    {
        fn: "decodeSessionCookie",
        event: "session-cookie-decode-failed",
        arrange: (error) => verifySessionCookieMock.mockRejectedValue(error),
        act: () => decodeSessionCookie(LEAKY_TOKEN),
    },
    {
        fn: "getSessionFromCookie",
        event: "session-cookie-verify-failed",
        arrange: (error) => verifySessionCookieMock.mockRejectedValue(error),
        act: () => getSessionFromCookie(LEAKY_TOKEN),
    },
    {
        fn: "revokeUserSessions",
        event: "session-revoke-failed",
        arrange: (error) => revokeRefreshTokensMock.mockRejectedValue(error),
        act: () => revokeUserSessions(LEAKY_UID),
    },
];

/** What the call surfaced to its caller: the error it rethrew, or null when it swallowed it. */
async function rethrownBy(scenario: Scenario): Promise<unknown> {
    try {
        await scenario.act();
        return null;
    } catch (thrown) {
        return thrown;
    }
}

function loggedLines(): string[] {
    return vi.mocked(console.warn).mock.calls.map((call) => String(call[0]));
}

function leakedSecrets(): string[] {
    const everything = [
        ...loggedLines(),
        ...vi.mocked(console.error).mock.calls.flat().map(String),
    ].join("\n");
    return [LEAKY_EMAIL, LEAKY_TOKEN, LEAKY_UID, LEAKY_MESSAGE].filter(
        (secret) => everything.includes(secret)
    );
}

beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "warn").mockImplementation(vi.fn());
    vi.spyOn(console, "error").mockImplementation(vi.fn());
});

describe.each(SCENARIOS)("$fn registra a falha pelo código", (scenario) => {
    it("erro com código do Firebase vira uma linha [auth] com code", async () => {
        const error = providerFailure();
        scenario.arrange(error);

        expect(await rethrownBy(scenario)).toBe(
            scenario.rethrows ? error : null
        );

        expect(loggedLines()).toEqual([
            `[auth] ${scenario.event} code=auth/internal-error`,
        ]);
        expect(console.error).not.toHaveBeenCalled();
        expect(leakedSecrets()).toEqual([]);
    });

    it("erro sem código vira uma linha [auth] com o nome do erro", async () => {
        const error = codelessFailure();
        scenario.arrange(error);

        expect(await rethrownBy(scenario)).toBe(
            scenario.rethrows ? error : null
        );

        expect(loggedLines()).toEqual([
            `[auth] ${scenario.event} reason=TypeError`,
        ]);
        expect(console.error).not.toHaveBeenCalled();
        expect(leakedSecrets()).toEqual([]);
    });
});

describe("falha que não é Error", () => {
    it("vira reason=unknown", async () => {
        getUserMock.mockRejectedValue(LEAKY_MESSAGE);

        await getUserById(LEAKY_UID);

        expect(loggedLines()).toEqual([
            "[auth] user-lookup-failed reason=unknown",
        ]);
        expect(leakedSecrets()).toEqual([]);
    });
});
