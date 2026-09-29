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
    canSendAuthActionLinkMock,
    buildEmailChangeLinkMock,
    sendEmailMock,
    revokeUserSessionsMock,
    recordAuditEventMock,
    jsonMock,
} = vi.hoisted(() => ({
    resolveApiActorMock: vi.fn(),
    findByReferenceIdMock: vi.fn(),
    signInWithPasswordMock: vi.fn(),
    canSendAuthActionLinkMock: vi.fn(),
    buildEmailChangeLinkMock: vi.fn(),
    sendEmailMock: vi.fn(),
    revokeUserSessionsMock: vi.fn(),
    recordAuditEventMock: vi.fn(),
    jsonMock: vi.fn(),
}));

class FakeIdentityToolkitError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "IdentityToolkitError";
    }
}

vi.mock("@/(shared)/lib/resolve-api-actor", () => ({
    resolveApiActor: (...args: unknown[]) => resolveApiActorMock(...args),
}));

vi.mock("@/(shared)/repositories/user.repository", () => ({
    userRepository: {
        findByReferenceId: (...args: unknown[]) =>
            findByReferenceIdMock(...args),
        touchLastAccess: vi.fn(),
    },
}));

vi.mock("@/(shared)/lib/firebase-identity-toolkit", () => ({
    IdentityToolkitError: FakeIdentityToolkitError,
    identitySignInWithPassword: (...args: unknown[]) =>
        signInWithPasswordMock(...args),
}));

vi.mock("@/(shared)/lib/auth-action-links", () => ({
    canSendAuthActionLink: () => canSendAuthActionLinkMock(),
    buildEmailChangeLink: (...args: unknown[]) =>
        buildEmailChangeLinkMock(...args),
}));

vi.mock("@repo/email", () => ({
    sendEmail: (...args: unknown[]) => sendEmailMock(...args),
}));

vi.mock("@repo/email/templates/action-link", () => ({
    actionLinkEmail: { id: "action-link" },
}));

vi.mock("@repo/email/templates/email-change-notice", () => ({
    emailChangeNoticeEmail: { id: "email-change-notice" },
}));

vi.mock("@repo/auth/server", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@repo/auth/server")>()),
    revokeUserSessions: (...args: unknown[]) => revokeUserSessionsMock(...args),
}));

vi.mock("@/(shared)/lib/audit-recorder", () => ({
    recordAuditEvent: (...args: unknown[]) => recordAuditEventMock(...args),
    recordImpersonationSession: vi.fn(),
}));

const { POST: requestEmailChange } = await import(
    "@/app/(routes)/account/email/route"
);

const OWNER_UID = "common-9";
const OWNER_EMAIL = "owner@example.com";
const NEW_EMAIL = "owner.new@example.com";
const ADMIN_UID = "admin-1";
const OWNER_PROFILE = {
    id: "profile-1",
    reference_id: OWNER_UID,
    type: UserType.COMMON,
};
const ADMIN_PROFILE = {
    id: "admin-profile",
    reference_id: ADMIN_UID,
    type: UserType.ADMIN,
};
const VALID_BODY = {
    newEmail: NEW_EMAIL,
    currentPassword: "current-secret",
    locale: "en",
};
const CHANGE_URL =
    "https://app.example.com/en/verify-email?oobCode=code&mode=verifyAndChangeEmail";

const PASSWORD_PROVIDER = [{ providerId: "password", uid: OWNER_EMAIL }];
const GOOGLE_PROVIDER = [{ providerId: "google.com", uid: "g-1" }];

const OWNER_HEADERS = {
    [AUTH_REQUEST_HEADER.USER_ID]: OWNER_UID,
    [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.COMMON,
    [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
    [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: OWNER_UID,
};

function request(body?: unknown, headers?: Record<string, string>) {
    return {
        method: "POST",
        url: "http://localhost:3002/account/email",
        headers: new Headers(headers ?? OWNER_HEADERS),
        json: () => {
            jsonMock();
            return Promise.resolve(body ?? {});
        },
    } as unknown as NextRequest;
}

async function codeOf(response: Response): Promise<string> {
    const body = (await response.json()) as { error: { code: string } };
    return body.error.code;
}

const outboundCalls = () =>
    buildEmailChangeLinkMock.mock.calls.length +
    sendEmailMock.mock.calls.length;

beforeEach(() => {
    vi.clearAllMocks();
    resolveApiActorMock.mockResolvedValue({
        uid: OWNER_UID,
        email: OWNER_EMAIL,
        displayName: "Jane",
        providerData: PASSWORD_PROVIDER,
    });
    findByReferenceIdMock.mockImplementation((uid: string) =>
        Promise.resolve(uid === ADMIN_UID ? ADMIN_PROFILE : OWNER_PROFILE)
    );
    signInWithPasswordMock.mockResolvedValue({ localId: OWNER_UID });
    canSendAuthActionLinkMock.mockReturnValue(true);
    buildEmailChangeLinkMock.mockResolvedValue({ ok: true, url: CHANGE_URL });
    sendEmailMock.mockResolvedValue({ sent: true, id: "email-1" });
});

describe("POST /account/email", () => {
    it("avisa o endereço atual antes de mandar o link ao novo", async () => {
        const response = await requestEmailChange(request(VALID_BODY));
        const body = (await response.json()) as {
            data: { requested: boolean };
        };

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(body.data.requested).toBe(true);
        expect(signInWithPasswordMock).toHaveBeenCalledWith(
            OWNER_EMAIL,
            VALID_BODY.currentPassword
        );
        expect(buildEmailChangeLinkMock).toHaveBeenCalledWith(
            OWNER_EMAIL,
            NEW_EMAIL,
            "en"
        );
        expect(sendEmailMock).toHaveBeenCalledTimes(2);
        expect(sendEmailMock.mock.calls[0]?.[0]).toMatchObject({
            template: { id: "email-change-notice" },
            to: OWNER_EMAIL,
            locale: "en",
            data: { name: "Jane", newEmail: NEW_EMAIL },
        });
        expect(sendEmailMock.mock.calls[1]?.[0]).toMatchObject({
            template: { id: "action-link" },
            to: NEW_EMAIL,
            locale: "en",
            data: { name: "Jane", url: CHANGE_URL, action: "changeEmail" },
        });
    });

    it("não muda nada na conta antes de o link ser aberto", async () => {
        await requestEmailChange(request(VALID_BODY));

        expect(revokeUserSessionsMock).not.toHaveBeenCalled();
        expect(recordAuditEventMock).not.toHaveBeenCalled();
    });

    it("normaliza o novo endereço para minúsculas e sem espaços nas pontas", async () => {
        await requestEmailChange(
            request({ ...VALID_BODY, newEmail: "  Owner.New@Example.COM " })
        );

        expect(buildEmailChangeLinkMock).toHaveBeenCalledWith(
            OWNER_EMAIL,
            NEW_EMAIL,
            "en"
        );
    });

    it("usa o e-mail como nome quando a conta não tem nome de exibição", async () => {
        resolveApiActorMock.mockResolvedValue({
            uid: OWNER_UID,
            email: OWNER_EMAIL,
            displayName: undefined,
            providerData: PASSWORD_PROVIDER,
        });

        await requestEmailChange(request(VALID_BODY));

        expect(sendEmailMock.mock.calls[0]?.[0]).toMatchObject({
            data: { name: OWNER_EMAIL },
        });
    });

    it("responde 503 EMAIL_NOT_CONFIGURED sem ler o corpo nem gastar cota", async () => {
        canSendAuthActionLinkMock.mockReturnValue(false);

        const response = await requestEmailChange(request(VALID_BODY));

        expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
        expect(await codeOf(response)).toBe("EMAIL_NOT_CONFIGURED");
        expect(jsonMock).not.toHaveBeenCalled();
        expect(signInWithPasswordMock).not.toHaveBeenCalled();
        expect(outboundCalls()).toBe(0);
    });

    it("recusa o endereço igual ao atual, sem diferenciar maiúsculas, antes de conferir a senha", async () => {
        const response = await requestEmailChange(
            request({ ...VALID_BODY, newEmail: " OWNER@example.com " })
        );

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await codeOf(response)).toBe("ACCOUNT_EMAIL_UNCHANGED");
        expect(signInWithPasswordMock).not.toHaveBeenCalled();
        expect(outboundCalls()).toBe(0);
    });

    it("não gera link quando a senha atual não confere", async () => {
        signInWithPasswordMock.mockRejectedValue(
            new FakeIdentityToolkitError("INVALID_LOGIN_CREDENTIALS")
        );

        const response = await requestEmailChange(request(VALID_BODY));

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await codeOf(response)).toBe("ACCOUNT_CURRENT_PASSWORD_INVALID");
        expect(outboundCalls()).toBe(0);
    });

    it("responde 429 quando o Identity Toolkit barra por excesso de tentativas", async () => {
        signInWithPasswordMock.mockRejectedValue(
            new FakeIdentityToolkitError("TOO_MANY_ATTEMPTS_TRY_LATER")
        );

        const response = await requestEmailChange(request(VALID_BODY));

        expect(response.status).toBe(HTTP_STATUS.TOO_MANY_REQUESTS);
        expect(await codeOf(response)).toBe("USERS_AUTH_RATE_LIMITED");
        expect(outboundCalls()).toBe(0);
    });

    it("recusa a conta que só entra pelo Google, sem chamar o toolkit", async () => {
        resolveApiActorMock.mockResolvedValue({
            uid: OWNER_UID,
            email: OWNER_EMAIL,
            providerData: GOOGLE_PROVIDER,
        });

        const response = await requestEmailChange(request(VALID_BODY));

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await codeOf(response)).toBe(
            "ACCOUNT_EMAIL_CHANGE_REAUTH_UNSUPPORTED"
        );
        expect(signInWithPasswordMock).not.toHaveBeenCalled();
        expect(outboundCalls()).toBe(0);
    });

    it("recusa a conta sem e-mail no registro de Auth", async () => {
        resolveApiActorMock.mockResolvedValue({
            uid: OWNER_UID,
            email: undefined,
            providerData: PASSWORD_PROVIDER,
        });

        const response = await requestEmailChange(request(VALID_BODY));

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await codeOf(response)).toBe("ACCOUNT_PASSWORD_UNSUPPORTED");
        expect(signInWithPasswordMock).not.toHaveBeenCalled();
    });

    it("responde USERS_AUTH_EMAIL_ALREADY_IN_USE para endereço que já tem conta", async () => {
        buildEmailChangeLinkMock.mockResolvedValue({
            ok: false,
            reason: "email-in-use",
        });

        const response = await requestEmailChange(request(VALID_BODY));

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await codeOf(response)).toBe("USERS_AUTH_EMAIL_ALREADY_IN_USE");
        expect(sendEmailMock).not.toHaveBeenCalled();
    });

    it("responde 503 EMAIL_SEND_FAILED quando o provedor recusa gerar o link", async () => {
        buildEmailChangeLinkMock.mockResolvedValue({
            ok: false,
            reason: "refused",
        });

        const response = await requestEmailChange(request(VALID_BODY));

        expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
        expect(await codeOf(response)).toBe("EMAIL_SEND_FAILED");
        expect(sendEmailMock).not.toHaveBeenCalled();
    });

    it("responde 500 ACCOUNT_UPDATE_FAILED quando o Admin SDK falha de forma inesperada", async () => {
        buildEmailChangeLinkMock.mockRejectedValue(new Error("boom"));

        const response = await requestEmailChange(request(VALID_BODY));

        expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
        expect(await codeOf(response)).toBe("ACCOUNT_UPDATE_FAILED");
        expect(sendEmailMock).not.toHaveBeenCalled();
    });

    it("não manda o link quando o aviso ao endereço atual falha", async () => {
        sendEmailMock.mockResolvedValueOnce({
            sent: false,
            reason: "provider-error",
        });

        const response = await requestEmailChange(request(VALID_BODY));

        expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
        expect(await codeOf(response)).toBe("EMAIL_SEND_FAILED");
        expect(sendEmailMock).toHaveBeenCalledTimes(1);
        expect(sendEmailMock.mock.calls[0]?.[0]).toMatchObject({
            to: OWNER_EMAIL,
        });
    });

    it("responde 503 EMAIL_SEND_FAILED quando o link não é entregue", async () => {
        sendEmailMock
            .mockResolvedValueOnce({ sent: true, id: "notice" })
            .mockResolvedValueOnce({ sent: false, reason: "provider-error" });

        const response = await requestEmailChange(request(VALID_BODY));

        expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
        expect(await codeOf(response)).toBe("EMAIL_SEND_FAILED");
    });

    it.each([
        ["um uid no corpo", { ...VALID_BODY, uid: "outra-pessoa" }],
        ["um id no corpo", { ...VALID_BODY, id: "profile-2" }],
        ["um e-mail malformado", { ...VALID_BODY, newEmail: "not-an-email" }],
        ["uma senha curta", { ...VALID_BODY, currentPassword: "12345" }],
        ["um idioma desconhecido", { ...VALID_BODY, locale: "fr" }],
    ])("recusa %s com VALIDATION_FAILED", async (_label, body) => {
        const response = await requestEmailChange(request(body));

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await codeOf(response)).toBe("VALIDATION_FAILED");
        expect(signInWithPasswordMock).not.toHaveBeenCalled();
        expect(outboundCalls()).toBe(0);
    });

    it("recusa a troca durante uma personificação", async () => {
        resolveApiActorMock.mockResolvedValue({
            uid: ADMIN_UID,
            email: "admin@example.com",
            providerData: PASSWORD_PROVIDER,
        });

        const response = await requestEmailChange(
            request(VALID_BODY, {
                [AUTH_REQUEST_HEADER.USER_ID]: ADMIN_UID,
                [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.ADMIN,
                [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
                [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: OWNER_UID,
            })
        );

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await codeOf(response)).toBe(
            "AUTH_REQUEST_IMPERSONATION_READ_ONLY"
        );
        expect(outboundCalls()).toBe(0);
    });

    it("recusa quando o perfil em contexto não é o dono da sessão", async () => {
        findByReferenceIdMock.mockResolvedValue({
            ...OWNER_PROFILE,
            reference_id: "outra-pessoa",
        });

        const response = await requestEmailChange(request(VALID_BODY));

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await codeOf(response)).toBe(
            "AUTH_REQUEST_IMPERSONATION_FORBIDDEN"
        );
        expect(signInWithPasswordMock).not.toHaveBeenCalled();
        expect(outboundCalls()).toBe(0);
    });

    it("recusa o perfil admin", async () => {
        resolveApiActorMock.mockResolvedValue({
            uid: ADMIN_UID,
            email: "admin@example.com",
            providerData: PASSWORD_PROVIDER,
        });

        const response = await requestEmailChange(
            request(VALID_BODY, {
                [AUTH_REQUEST_HEADER.USER_ID]: ADMIN_UID,
                [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.ADMIN,
                [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.ADMIN,
                [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: ADMIN_UID,
            })
        );

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await codeOf(response)).toBe("COMMON_PANEL_FORBIDDEN");
        expect(outboundCalls()).toBe(0);
    });

    it("recusa quem não apresenta credencial", async () => {
        resolveApiActorMock.mockResolvedValue(null);

        const response = await requestEmailChange(request(VALID_BODY));

        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
        expect(await codeOf(response)).toBe("AUTH_INVALID_TOKEN");
        expect(outboundCalls()).toBe(0);
    });
});
