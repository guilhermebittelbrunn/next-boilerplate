import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { EXISTING_PASSWORD_MIN_LENGTH } from "@repo/shared/utils/helpers/passwordPolicy";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { signInWithPasswordMock, getMergedUserByUidMock } = vi.hoisted(() => ({
    signInWithPasswordMock: vi.fn(),
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
    identitySignInWithPassword: (...args: unknown[]) =>
        signInWithPasswordMock(...args),
}));

vi.mock("@/(shared)/lib/user-merge", () => ({
    getMergedUserByUid: (...args: unknown[]) => getMergedUserByUidMock(...args),
}));

const { POST } = await import("@/app/(routes)/auth/sign-in/route");

const EMAIL = "qa-api-error-codes@example.com";
const PASSWORD = "secret-for-tests";
const SESSION = {
    localId: "uid-sign-in-1",
    idToken: "id-token",
    refreshToken: "refresh-token",
    expiresIn: "3600",
};
const USER = { uid: SESSION.localId, email: EMAIL };

function request(body?: string): Request {
    return new Request("http://localhost:3002/auth/sign-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
    });
}

function jsonRequest(body: unknown): Request {
    return request(JSON.stringify(body));
}

beforeEach(() => {
    signInWithPasswordMock.mockReset();
    getMergedUserByUidMock.mockReset();
    signInWithPasswordMock.mockResolvedValue(SESSION);
    getMergedUserByUidMock.mockResolvedValue(USER);
});

describe("POST /auth/sign-in — corpo", () => {
    it.each([
        ["sem corpo", request()],
        ["com JSON inválido", request("{email:")],
        ["com objeto vazio", jsonRequest({})],
        [
            "com e-mail inválido",
            jsonRequest({ email: "not-an-email", password: PASSWORD }),
        ],
        [
            "com senha abaixo do mínimo de login, sem cair em AUTH_PASSWORD_TOO_SHORT",
            jsonRequest({
                email: EMAIL,
                password: "x".repeat(EXISTING_PASSWORD_MIN_LENGTH - 1),
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
            expect(signInWithPasswordMock).not.toHaveBeenCalled();
        }
    );

    it("aceita a senha no mínimo de login, que é menor que o de senha nova", async () => {
        const password = "x".repeat(EXISTING_PASSWORD_MIN_LENGTH);

        const response = await POST(jsonRequest({ email: EMAIL, password }));

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(signInWithPasswordMock).toHaveBeenCalledWith(EMAIL, password);
    });

    it("apara o e-mail antes de chamar o provedor", async () => {
        await POST(jsonRequest({ email: `  ${EMAIL} `, password: PASSWORD }));

        expect(signInWithPasswordMock).toHaveBeenCalledWith(EMAIL, PASSWORD);
    });
});

describe("POST /auth/sign-in — provedor", () => {
    it("responde 400 AUTH_INVALID_CREDENTIALS sem ecoar a mensagem do provedor", async () => {
        signInWithPasswordMock.mockRejectedValue(
            new FakeIdentityToolkitError(
                "INVALID_LOGIN_CREDENTIALS",
                HTTP_STATUS.BAD_REQUEST
            )
        );

        const response = await POST(
            jsonRequest({ email: EMAIL, password: PASSWORD })
        );
        const body = await response.json();

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(body).toEqual({ error: { code: "AUTH_INVALID_CREDENTIALS" } });
        expect(JSON.stringify(body)).not.toContain("INVALID_LOGIN_CREDENTIALS");
        expect(getMergedUserByUidMock).not.toHaveBeenCalled();
    });

    it("responde o mesmo AUTH_INVALID_CREDENTIALS para conta desativada", async () => {
        signInWithPasswordMock.mockRejectedValue(
            new FakeIdentityToolkitError(
                "USER_DISABLED",
                HTTP_STATUS.BAD_REQUEST
            )
        );

        const response = await POST(
            jsonRequest({ email: EMAIL, password: PASSWORD })
        );

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        await expect(response.json()).resolves.toEqual({
            error: { code: "AUTH_INVALID_CREDENTIALS" },
        });
    });

    it("responde 429 USERS_AUTH_RATE_LIMITED quando o provedor limita", async () => {
        signInWithPasswordMock.mockRejectedValue(
            new FakeIdentityToolkitError(
                "TOO_MANY_ATTEMPTS_TRY_LATER : Access to this account has been temporarily disabled",
                HTTP_STATUS.BAD_REQUEST
            )
        );

        const response = await POST(
            jsonRequest({ email: EMAIL, password: PASSWORD })
        );

        expect(response.status).toBe(HTTP_STATUS.TOO_MANY_REQUESTS);
        await expect(response.json()).resolves.toEqual({
            error: { code: "USERS_AUTH_RATE_LIMITED" },
        });
    });

    it("deixa propagar o erro que não vem do provedor", async () => {
        signInWithPasswordMock.mockRejectedValue(new Error("network down"));

        await expect(
            POST(jsonRequest({ email: EMAIL, password: PASSWORD }))
        ).rejects.toThrow("network down");
    });
});

describe("POST /auth/sign-in — usuário", () => {
    it("responde 404 USERS_NOT_FOUND quando a conta sumiu do Auth", async () => {
        getMergedUserByUidMock.mockResolvedValue(null);

        const response = await POST(
            jsonRequest({ email: EMAIL, password: PASSWORD })
        );

        expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
        await expect(response.json()).resolves.toEqual({
            error: { code: "USERS_NOT_FOUND" },
        });
        expect(getMergedUserByUidMock).toHaveBeenCalledWith(SESSION.localId);
    });

    it("mantém o formato de sucesso { session, user }", async () => {
        const response = await POST(
            jsonRequest({ email: EMAIL, password: PASSWORD })
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
