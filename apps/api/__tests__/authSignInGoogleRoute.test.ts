import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { signInWithGoogleMock, getMergedUserByUidMock } = vi.hoisted(() => ({
    signInWithGoogleMock: vi.fn(),
    getMergedUserByUidMock: vi.fn(),
}));

class FakeIdentityToolkitError extends Error {
    readonly code: number | undefined;

    constructor(message: string, code?: number) {
        super(message);
        this.name = "IdentityToolkitError";
        this.code = code;
    }
}

vi.mock("@/(shared)/lib/firebase-identity-toolkit", () => ({
    IdentityToolkitError: FakeIdentityToolkitError,
    identitySignInWithGoogleIdToken: (...args: unknown[]) =>
        signInWithGoogleMock(...args),
}));

vi.mock("@/(shared)/lib/user-merge", () => ({
    getMergedUserByUid: (...args: unknown[]) => getMergedUserByUidMock(...args),
}));

const { POST } = await import("@/app/(routes)/auth/sign-in/google/route");

const ID_TOKEN = "google-id-token";
const REQUEST_URI = "https://app.example.com";
const DEFAULT_REQUEST_URI = "http://localhost:3000";
const ID_TOKEN_MAX = 4096;
const REQUEST_URI_MAX = 2048;
const MISSING_API_KEY_MESSAGE =
    "FIREBASE_WEB_API_KEY or NEXT_PUBLIC_FIREBASE_API_KEY is not configured";
const SESSION = {
    localId: "uid-google-1",
    idToken: "id-token",
    refreshToken: "refresh-token",
    expiresIn: "3600",
};
const USER = {
    uid: SESSION.localId,
    email: "qa-google-sign-in-error-contract@example.com",
};

function request(body?: string): Request {
    return new Request("http://localhost:3002/auth/sign-in/google", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
    });
}

function jsonRequest(body: unknown): Request {
    return request(JSON.stringify(body));
}

function rejectWith(message: string) {
    signInWithGoogleMock.mockRejectedValue(
        new FakeIdentityToolkitError(message, HTTP_STATUS.BAD_REQUEST)
    );
}

beforeEach(() => {
    signInWithGoogleMock.mockReset();
    getMergedUserByUidMock.mockReset();
    signInWithGoogleMock.mockResolvedValue(SESSION);
    getMergedUserByUidMock.mockResolvedValue(USER);
});

describe("POST /auth/sign-in/google — corpo", () => {
    it.each([
        ["sem corpo", request()],
        ["com JSON inválido", request("{idToken:")],
        ["com objeto vazio", jsonRequest({})],
        ["com idToken vazio", jsonRequest({ idToken: "" })],
        ["com idToken numérico", jsonRequest({ idToken: 123 })],
        [
            "com idToken acima de 4096 caracteres",
            jsonRequest({ idToken: "x".repeat(ID_TOKEN_MAX + 1) }),
        ],
        [
            "com requestUri que não é URL",
            jsonRequest({ idToken: ID_TOKEN, requestUri: "not a url" }),
        ],
        [
            "com requestUri javascript:",
            jsonRequest({
                idToken: ID_TOKEN,
                requestUri: "javascript:alert(1)",
            }),
        ],
        [
            "com requestUri ftp:",
            jsonRequest({ idToken: ID_TOKEN, requestUri: "ftp://x.com" }),
        ],
        [
            "com requestUri sem esquema",
            jsonRequest({ idToken: ID_TOKEN, requestUri: "localhost:3000" }),
        ],
        [
            "com requestUri acima de 2048 caracteres",
            jsonRequest({
                idToken: ID_TOKEN,
                requestUri: `https://example.com/${"a".repeat(REQUEST_URI_MAX)}`,
            }),
        ],
    ])(
        "responde 400 VALIDATION_FAILED %s, sem chamar o provedor",
        async (_case, incoming) => {
            const response = await POST(incoming);

            expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
            await expect(response.json()).resolves.toEqual({
                error: { code: "VALIDATION_FAILED" },
            });
            expect(signInWithGoogleMock).not.toHaveBeenCalled();
        }
    );

    it("usa o requestUri padrão quando o corpo traz só o idToken", async () => {
        const response = await POST(jsonRequest({ idToken: ID_TOKEN }));

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(signInWithGoogleMock).toHaveBeenCalledWith(
            ID_TOKEN,
            DEFAULT_REQUEST_URI
        );
    });

    it.each([REQUEST_URI, "http://localhost", DEFAULT_REQUEST_URI])(
        "repassa o requestUri %s ao provedor",
        async (requestUri) => {
            const response = await POST(
                jsonRequest({ idToken: ID_TOKEN, requestUri })
            );

            expect(response.status).toBe(HTTP_STATUS.OK);
            expect(signInWithGoogleMock).toHaveBeenCalledWith(
                ID_TOKEN,
                requestUri
            );
        }
    );

    it("ignora chaves fora do schema", async () => {
        const response = await POST(
            jsonRequest({ idToken: ID_TOKEN, extra: "ignored" })
        );

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(signInWithGoogleMock).toHaveBeenCalledWith(
            ID_TOKEN,
            DEFAULT_REQUEST_URI
        );
    });
});

describe("POST /auth/sign-in/google — provedor", () => {
    it("responde 400 AUTH_INVALID_CREDENTIALS para conta desativada, sem ecoar a mensagem", async () => {
        rejectWith("USER_DISABLED");

        const response = await POST(jsonRequest({ idToken: ID_TOKEN }));
        const body = await response.json();

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(body).toEqual({ error: { code: "AUTH_INVALID_CREDENTIALS" } });
        expect(JSON.stringify(body)).not.toContain("USER_DISABLED");
        expect(getMergedUserByUidMock).not.toHaveBeenCalled();
    });

    it.each([
        "INVALID_IDP_RESPONSE : Invalid Idp Response: the Google id_token is not allowed to be used with this application.",
        "Invalid response from identity provider",
        MISSING_API_KEY_MESSAGE,
    ])(
        "responde 400 AUTH_INVALID_CREDENTIALS para a recusa %s, sem ecoar a mensagem",
        async (message) => {
            rejectWith(message);

            const response = await POST(jsonRequest({ idToken: ID_TOKEN }));
            const raw = await response.text();

            expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
            expect(JSON.parse(raw)).toEqual({
                error: { code: "AUTH_INVALID_CREDENTIALS" },
            });
            expect(raw).not.toContain(message);
            expect(raw).not.toContain("FIREBASE_WEB_API_KEY");
        }
    );

    it.each(["TOO_MANY_ATTEMPTS_TRY_LATER", "TOO_MANY_REQUESTS"])(
        "responde 429 USERS_AUTH_RATE_LIMITED para %s",
        async (message) => {
            rejectWith(message);

            const response = await POST(jsonRequest({ idToken: ID_TOKEN }));

            expect(response.status).toBe(HTTP_STATUS.TOO_MANY_REQUESTS);
            await expect(response.json()).resolves.toEqual({
                error: { code: "USERS_AUTH_RATE_LIMITED" },
            });
        }
    );

    it("deixa propagar o erro que não vem do provedor", async () => {
        signInWithGoogleMock.mockRejectedValue(new Error("network down"));

        await expect(POST(jsonRequest({ idToken: ID_TOKEN }))).rejects.toThrow(
            "network down"
        );
    });
});

describe("POST /auth/sign-in/google — usuário", () => {
    it("responde 404 USERS_NOT_FOUND sem session quando não há perfil vivo", async () => {
        getMergedUserByUidMock.mockResolvedValue(null);

        const response = await POST(jsonRequest({ idToken: ID_TOKEN }));

        expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
        await expect(response.json()).resolves.toEqual({
            error: { code: "USERS_NOT_FOUND" },
        });
        expect(getMergedUserByUidMock).toHaveBeenCalledWith(SESSION.localId);
    });

    it("mantém o formato de sucesso { session, user }", async () => {
        const response = await POST(
            jsonRequest({ idToken: ID_TOKEN, requestUri: REQUEST_URI })
        );

        expect(response.status).toBe(HTTP_STATUS.OK);
        await expect(response.json()).resolves.toEqual({
            session: {
                idToken: SESSION.idToken,
                refreshToken: SESSION.refreshToken,
                expiresIn: SESSION.expiresIn,
            },
            user: USER,
        });
    });
});
