import { UserRoleLevel } from "@repo/auth/types";
import { UserType } from "@repo/sdk/src/types";
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    resolveApiActorMock,
    findByReferenceIdMock,
    signInWithPasswordMock,
    updateUserMock,
    revokeUserSessionsMock,
} = vi.hoisted(() => ({
    resolveApiActorMock: vi.fn(),
    findByReferenceIdMock: vi.fn(),
    signInWithPasswordMock: vi.fn(),
    updateUserMock: vi.fn(),
    revokeUserSessionsMock: vi.fn(),
}));

class FakeIdentityToolkitError extends Error {
    readonly code: number | undefined;

    constructor(message: string, code?: number) {
        super(message);
        this.name = "IdentityToolkitError";
        this.code = code;
    }
}

vi.mock("@/(shared)/lib/resolve-api-actor", () => ({
    resolveApiActor: (...args: unknown[]) => resolveApiActorMock(...args),
}));

vi.mock("@/(shared)/repositories/user.repository", () => ({
    userRepository: {
        findByReferenceId: (...args: unknown[]) =>
            findByReferenceIdMock(...args),
        update: vi.fn(),
    },
}));

vi.mock("@/(shared)/lib/firebase-identity-toolkit", () => ({
    IdentityToolkitError: FakeIdentityToolkitError,
    identitySignInWithPassword: (...args: unknown[]) =>
        signInWithPasswordMock(...args),
}));

vi.mock("@repo/auth/server", () => ({
    getAuthInstance: () => ({ updateUser: updateUserMock }),
    revokeUserSessions: (...args: unknown[]) => revokeUserSessionsMock(...args),
}));

const { POST: changePassword } = await import(
    "@/app/(routes)/account/password/route"
);
const { POST: revokeSessions } = await import(
    "@/app/(routes)/account/sessions/revoke/route"
);

const OWNER_UID = "common-9";
const OWNER_EMAIL = "owner@example.com";
const OWNER_PROFILE = {
    id: "profile-1",
    reference_id: OWNER_UID,
    type: UserType.COMMON,
};
const VALID_BODY = {
    currentPassword: "current-secret",
    password: "brand-new-secret",
};

function request(
    body?: unknown,
    url = "http://localhost:3002/account/password"
) {
    return {
        method: "POST",
        url,
        headers: new Headers({
            [AUTH_REQUEST_HEADER.USER_ID]: OWNER_UID,
            [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.COMMON,
            [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
            [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: OWNER_UID,
        }),
        json: () => Promise.resolve(body ?? {}),
    } as unknown as NextRequest;
}

async function codeOf(response: Response): Promise<string> {
    const body = (await response.json()) as { error: { code: string } };
    return body.error.code;
}

beforeEach(() => {
    for (const mock of [
        resolveApiActorMock,
        findByReferenceIdMock,
        signInWithPasswordMock,
        updateUserMock,
        revokeUserSessionsMock,
    ]) {
        mock.mockReset();
    }
    resolveApiActorMock.mockResolvedValue({
        uid: OWNER_UID,
        email: OWNER_EMAIL,
    });
    findByReferenceIdMock.mockResolvedValue({ ...OWNER_PROFILE });
    signInWithPasswordMock.mockResolvedValue({ localId: OWNER_UID });
    updateUserMock.mockResolvedValue({ uid: OWNER_UID });
});

describe("POST /account/password", () => {
    it("troca a senha e encerra todas as sessões da conta", async () => {
        const response = await changePassword(request(VALID_BODY));

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(signInWithPasswordMock).toHaveBeenCalledWith(
            OWNER_EMAIL,
            VALID_BODY.currentPassword
        );
        expect(updateUserMock).toHaveBeenCalledWith(OWNER_UID, {
            password: VALID_BODY.password,
        });
        expect(revokeUserSessionsMock).toHaveBeenCalledWith(OWNER_UID);
    });

    it("revoga as sessões apenas depois de a senha ter sido gravada", async () => {
        updateUserMock.mockRejectedValue(new Error("auth is down"));

        const response = await changePassword(request(VALID_BODY));

        expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
        expect(await codeOf(response)).toBe("ACCOUNT_UPDATE_FAILED");
        expect(revokeUserSessionsMock).not.toHaveBeenCalled();
    });

    it("responde 429 quando o Identity Toolkit barra por excesso de tentativas", async () => {
        signInWithPasswordMock.mockRejectedValue(
            new FakeIdentityToolkitError("TOO_MANY_ATTEMPTS_TRY_LATER")
        );

        const response = await changePassword(request(VALID_BODY));

        expect(response.status).toBe(HTTP_STATUS.TOO_MANY_REQUESTS);
        expect(await codeOf(response)).toBe("USERS_AUTH_RATE_LIMITED");
        expect(updateUserMock).not.toHaveBeenCalled();
        expect(revokeUserSessionsMock).not.toHaveBeenCalled();
    });

    it("responde 400 com o código da senha atual quando a credencial não confere", async () => {
        signInWithPasswordMock.mockRejectedValue(
            new FakeIdentityToolkitError("INVALID_LOGIN_CREDENTIALS")
        );

        const response = await changePassword(request(VALID_BODY));

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await codeOf(response)).toBe("ACCOUNT_CURRENT_PASSWORD_INVALID");
        expect(updateUserMock).not.toHaveBeenCalled();
    });

    it("não vaza o código de cadastro num fluxo de troca de senha", async () => {
        signInWithPasswordMock.mockRejectedValue(
            new FakeIdentityToolkitError("EMAIL_NOT_FOUND")
        );

        const response = await changePassword(request(VALID_BODY));

        expect(await codeOf(response)).not.toBe("USERS_AUTH_SIGN_UP_FAILED");
    });

    it("recusa a troca quando a conta não tem e-mail e senha", async () => {
        resolveApiActorMock.mockResolvedValue({
            uid: OWNER_UID,
            email: undefined,
        });

        const response = await changePassword(request(VALID_BODY));

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await codeOf(response)).toBe("ACCOUNT_PASSWORD_UNSUPPORTED");
        expect(signInWithPasswordMock).not.toHaveBeenCalled();
    });

    it("recusa uma senha nova curta antes de conferir a senha atual", async () => {
        const response = await changePassword(
            request({ currentPassword: "current-secret", password: "abc" })
        );

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await codeOf(response)).toBe("VALIDATION_FAILED");
        expect(signInWithPasswordMock).not.toHaveBeenCalled();
    });

    it("recusa um uid no corpo em vez de trocar a senha de outra conta", async () => {
        const response = await changePassword(
            request({ ...VALID_BODY, uid: "someone-else" })
        );

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await codeOf(response)).toBe("VALIDATION_FAILED");
        expect(updateUserMock).not.toHaveBeenCalled();
    });

    it("recusa quem não apresenta credencial", async () => {
        resolveApiActorMock.mockResolvedValue(null);

        const response = await changePassword(request(VALID_BODY));

        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
        expect(await codeOf(response)).toBe("AUTH_INVALID_TOKEN");
    });

    it("recusa a troca de senha durante uma personificação", async () => {
        resolveApiActorMock.mockResolvedValue({
            uid: "admin-1",
            email: "admin@example.com",
        });
        findByReferenceIdMock.mockResolvedValue({
            id: "admin-profile",
            reference_id: "admin-1",
            type: UserType.ADMIN,
        });
        const impersonated = {
            method: "POST",
            url: "http://localhost:3002/account/password",
            headers: new Headers({
                [AUTH_REQUEST_HEADER.USER_ID]: "admin-1",
                [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.ADMIN,
                [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
                [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: OWNER_UID,
            }),
            json: () => Promise.resolve(VALID_BODY),
        } as unknown as NextRequest;

        const response = await changePassword(impersonated);

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(updateUserMock).not.toHaveBeenCalled();
    });
});

describe("POST /account/sessions/revoke", () => {
    const revokeRequest = () =>
        request(undefined, "http://localhost:3002/account/sessions/revoke");

    it("encerra as sessões do uid derivado do token", async () => {
        const response = await revokeSessions(revokeRequest());
        const body = (await response.json()) as {
            data: { confirmed: boolean };
        };

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(body.data.confirmed).toBe(true);
        expect(revokeUserSessionsMock).toHaveBeenCalledWith(OWNER_UID);
    });

    it("ignora um uid enviado no corpo", async () => {
        await revokeSessions(
            request(
                { uid: "someone-else" },
                "http://localhost:3002/account/sessions/revoke"
            )
        );

        expect(revokeUserSessionsMock).toHaveBeenCalledWith(OWNER_UID);
        expect(revokeUserSessionsMock).not.toHaveBeenCalledWith("someone-else");
    });

    it("recusa quem não apresenta credencial", async () => {
        resolveApiActorMock.mockResolvedValue(null);

        const response = await revokeSessions(revokeRequest());

        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
        expect(revokeUserSessionsMock).not.toHaveBeenCalled();
    });

    it("recusa quem tem credencial mas não tem perfil no painel comum", async () => {
        findByReferenceIdMock.mockResolvedValue(null);

        const response = await revokeSessions(revokeRequest());

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(revokeUserSessionsMock).not.toHaveBeenCalled();
    });

    it("recusa encerrar as sessões do personificado", async () => {
        resolveApiActorMock.mockResolvedValue({
            uid: "admin-1",
            email: "admin@example.com",
        });
        findByReferenceIdMock.mockResolvedValue({
            id: "admin-profile",
            reference_id: "admin-1",
            type: UserType.ADMIN,
        });
        const impersonated = {
            method: "POST",
            url: "http://localhost:3002/account/sessions/revoke",
            headers: new Headers({
                [AUTH_REQUEST_HEADER.USER_ID]: "admin-1",
                [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.ADMIN,
                [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
                [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: OWNER_UID,
            }),
            json: () => Promise.resolve({}),
        } as unknown as NextRequest;

        const response = await revokeSessions(impersonated);

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(revokeUserSessionsMock).not.toHaveBeenCalled();
    });
});
