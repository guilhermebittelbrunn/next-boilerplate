import { UserRoleLevel } from "@repo/auth/types";
import { AuditAction, AuditTargetType, UserType } from "@repo/sdk/src/types";
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { REQUEST_ID_HEADER } from "@repo/shared/utils/helpers/request-id";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    resolveApiActorMock,
    findByReferenceIdMock,
    updateUserMock,
    revokeUserSessionsMock,
    recordAuditEventMock,
    logEventMock,
} = vi.hoisted(() => ({
    resolveApiActorMock: vi.fn(),
    findByReferenceIdMock: vi.fn(),
    updateUserMock: vi.fn(),
    revokeUserSessionsMock: vi.fn(),
    recordAuditEventMock: vi.fn(),
    logEventMock: vi.fn(),
}));

vi.mock("@/(shared)/lib/audit-recorder", () => ({
    recordAuditEvent: (...args: unknown[]) => recordAuditEventMock(...args),
    recordImpersonationSession: vi.fn(),
}));

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

vi.mock("@repo/auth/server", () => ({
    getAuthInstance: () => ({ updateUser: updateUserMock }),
    revokeUserSessions: (...args: unknown[]) => revokeUserSessionsMock(...args),
}));

vi.mock("@repo/shared/utils/helpers/log", () => ({
    logEvent: (...args: unknown[]) => logEventMock(...args),
}));

const { logEvent: realLogEvent } = await vi.importActual<
    typeof import("@repo/shared/utils/helpers/log")
>("@repo/shared/utils/helpers/log");

const { DELETE: unlinkMethod } = await import(
    "@/app/(routes)/account/sign-in-methods/[id]/route"
);
const { POST: confirmLinked } = await import(
    "@/app/(routes)/account/sign-in-methods/linked/route"
);

const NO_CONTENT = 204;
const PROVIDER_ID_MAX_LENGTH = 64;
const OWNER_UID = "owner-1";
const OWNER_EMAIL = "owner@example.com";
const ADDRESS_RESTORE_ATTEMPTS = 2;
const UNLINK_THEN_EVERY_RESTORE_CALLS = [
    [OWNER_UID, { providersToUnlink: ["password"] }],
    ...Array.from({ length: ADDRESS_RESTORE_ATTEMPTS }, () => [
        OWNER_UID,
        { email: OWNER_EMAIL, emailVerified: true },
    ]),
];
const OWNER_PROFILE = {
    id: "profile-1",
    reference_id: OWNER_UID,
    type: UserType.COMMON,
};
const BOTH_METHODS_USER = {
    uid: OWNER_UID,
    email: OWNER_EMAIL,
    emailVerified: true,
    providerData: [{ providerId: "password" }, { providerId: "google.com" }],
};
const OWNER_HEADERS = {
    [AUTH_REQUEST_HEADER.USER_ID]: OWNER_UID,
    [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.COMMON,
    [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
    [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: OWNER_UID,
};
const REQUEST_ID = "req-unlink-1";
const OWNER_HEADERS_WITH_REQUEST_ID = {
    ...OWNER_HEADERS,
    [REQUEST_ID_HEADER]: REQUEST_ID,
};
const IMPERSONATION_HEADERS = {
    [AUTH_REQUEST_HEADER.USER_ID]: "admin-1",
    [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.ADMIN,
    [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
    [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: OWNER_UID,
};

function request(
    method: string,
    url: string,
    body?: unknown,
    headers: Record<string, string> = OWNER_HEADERS
) {
    return {
        method,
        url,
        headers: new Headers(headers),
        json: () => Promise.resolve(body ?? {}),
    } as unknown as NextRequest;
}

const deleteRequest = (headers?: Record<string, string>) =>
    request(
        "DELETE",
        "http://localhost:3002/account/sign-in-methods/x",
        undefined,
        headers
    );

const linkedRequest = (body: unknown, headers?: Record<string, string>) =>
    request(
        "POST",
        "http://localhost:3002/account/sign-in-methods/linked",
        body,
        headers
    );

const idContext = (id: string) => ({ params: Promise.resolve({ id }) });

async function codeOf(response: Response): Promise<string> {
    const body = (await response.json()) as { error: { code: string } };
    return body.error.code;
}

const lastUpdateUserCallOrder = () =>
    updateUserMock.mock.invocationCallOrder.at(-1) ?? 0;

function failEveryAddressRestore(message = "restore failed") {
    updateUserMock
        .mockResolvedValueOnce({ uid: OWNER_UID })
        .mockRejectedValue({ code: "auth/internal-error", message });
}

function impersonateOwner() {
    resolveApiActorMock.mockResolvedValue({
        uid: "admin-1",
        email: "admin@example.com",
        providerData: [{ providerId: "password" }],
    });
    findByReferenceIdMock.mockImplementation((uid: string) =>
        Promise.resolve(
            uid === "admin-1"
                ? {
                      id: "admin-profile",
                      reference_id: "admin-1",
                      type: UserType.ADMIN,
                  }
                : { ...OWNER_PROFILE }
        )
    );
}

beforeEach(() => {
    for (const mock of [
        resolveApiActorMock,
        findByReferenceIdMock,
        updateUserMock,
        revokeUserSessionsMock,
        recordAuditEventMock,
        logEventMock,
    ]) {
        mock.mockReset();
    }
    resolveApiActorMock.mockResolvedValue({ ...BOTH_METHODS_USER });
    findByReferenceIdMock.mockResolvedValue({ ...OWNER_PROFILE });
    updateUserMock.mockResolvedValue({ uid: OWNER_UID });
});

describe("DELETE /account/sign-in-methods/[id]", () => {
    it("desvincula o Google, registra na trilha e responde 204", async () => {
        const response = await unlinkMethod(
            deleteRequest(),
            idContext("google.com")
        );

        expect(response.status).toBe(NO_CONTENT);
        expect(updateUserMock).toHaveBeenCalledTimes(1);
        expect(updateUserMock).toHaveBeenCalledWith(OWNER_UID, {
            providersToUnlink: ["google.com"],
        });
        expect(recordAuditEventMock).toHaveBeenCalledWith(
            expect.objectContaining({
                action: AuditAction.ACCOUNT_SIGN_IN_METHOD_UNLINK,
                actorUid: OWNER_UID,
                targetType: AuditTargetType.ACCOUNT,
                targetUserId: OWNER_PROFILE.id,
                changedFields: ["google.com"],
            })
        );
        expect(revokeUserSessionsMock).not.toHaveBeenCalled();
    });

    it("ao desvincular a senha, devolve à conta o e-mail e a verificação que o Firebase apaga", async () => {
        const response = await unlinkMethod(
            deleteRequest(),
            idContext("password")
        );

        expect(response.status).toBe(NO_CONTENT);
        expect(updateUserMock).toHaveBeenCalledTimes(2);
        expect(updateUserMock).toHaveBeenNthCalledWith(1, OWNER_UID, {
            providersToUnlink: ["password"],
        });
        expect(updateUserMock).toHaveBeenNthCalledWith(2, OWNER_UID, {
            email: OWNER_EMAIL,
            emailVerified: true,
        });
        expect(recordAuditEventMock).toHaveBeenCalledWith(
            expect.objectContaining({ changedFields: ["password"] })
        );
        expect(revokeUserSessionsMock).toHaveBeenCalledWith(OWNER_UID);
        expect(
            revokeUserSessionsMock.mock.invocationCallOrder[0]
        ).toBeGreaterThan(updateUserMock.mock.invocationCallOrder[1] ?? 0);
        expect(logEventMock).not.toHaveBeenCalled();
    });

    it("tenta a devolução do e-mail de novo quando a primeira falha e responde 204", async () => {
        updateUserMock
            .mockResolvedValueOnce({ uid: OWNER_UID })
            .mockRejectedValueOnce({ code: "auth/internal-error" });

        const response = await unlinkMethod(
            deleteRequest(),
            idContext("password")
        );

        expect(response.status).toBe(NO_CONTENT);
        expect(updateUserMock.mock.calls).toEqual(
            UNLINK_THEN_EVERY_RESTORE_CALLS
        );
        expect(revokeUserSessionsMock).toHaveBeenCalledWith(OWNER_UID);
        expect(
            revokeUserSessionsMock.mock.invocationCallOrder[0]
        ).toBeGreaterThan(lastUpdateUserCallOrder());
        expect(logEventMock).not.toHaveBeenCalled();
    });

    it("responde 409 ao tentar remover o único método", async () => {
        resolveApiActorMock.mockResolvedValue({
            ...BOTH_METHODS_USER,
            providerData: [{ providerId: "google.com" }],
        });

        const response = await unlinkMethod(
            deleteRequest(),
            idContext("google.com")
        );

        expect(response.status).toBe(HTTP_STATUS.CONFLICT);
        expect(await codeOf(response)).toBe("ACCOUNT_SIGN_IN_METHOD_LAST");
        expect(updateUserMock).not.toHaveBeenCalled();
        expect(recordAuditEventMock).not.toHaveBeenCalled();
    });

    it("responde 404 para um provedor que não está vinculado", async () => {
        const response = await unlinkMethod(
            deleteRequest(),
            idContext("github.com")
        );

        expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
        expect(await codeOf(response)).toBe("ACCOUNT_SIGN_IN_METHOD_NOT_FOUND");
        expect(updateUserMock).not.toHaveBeenCalled();
    });

    it.each([
        "GOOGLE.COM",
        "google com",
        "../password",
        "a".repeat(PROVIDER_ID_MAX_LENGTH + 1),
        "",
    ])("responde 404 para o id inválido %j", async (id) => {
        const response = await unlinkMethod(deleteRequest(), idContext(id));

        expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
        expect(await codeOf(response)).toBe("ACCOUNT_SIGN_IN_METHOD_NOT_FOUND");
        expect(updateUserMock).not.toHaveBeenCalled();
    });

    it("responde 500 e não registra nada quando o Firebase recusa o desvínculo", async () => {
        updateUserMock.mockRejectedValue(new Error("auth is down"));

        const response = await unlinkMethod(
            deleteRequest(),
            idContext("google.com")
        );

        expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
        expect(await codeOf(response)).toBe("ACCOUNT_UPDATE_FAILED");
        expect(recordAuditEventMock).not.toHaveBeenCalled();
    });

    it("não repete o desvínculo da senha quando o Firebase o recusa", async () => {
        updateUserMock.mockRejectedValue({ code: "auth/internal-error" });

        const response = await unlinkMethod(
            deleteRequest(),
            idContext("password")
        );

        expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
        expect(await codeOf(response)).toBe("ACCOUNT_UPDATE_FAILED");
        expect(updateUserMock).toHaveBeenCalledTimes(1);
        expect(recordAuditEventMock).not.toHaveBeenCalled();
        expect(revokeUserSessionsMock).not.toHaveBeenCalled();
        expect(logEventMock).not.toHaveBeenCalled();
    });

    it("revoga as sessões e registra o uid quando a devolução do e-mail falha nas duas tentativas", async () => {
        const restoreFailureMessage = `${OWNER_EMAIL} is unavailable`;
        updateUserMock
            .mockResolvedValueOnce({ uid: OWNER_UID })
            .mockRejectedValue({
                code: "auth/internal-error",
                message: restoreFailureMessage,
            });

        const response = await unlinkMethod(
            deleteRequest(),
            idContext("password")
        );

        expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
        expect(await codeOf(response)).toBe("ACCOUNT_UPDATE_FAILED");
        expect(updateUserMock.mock.calls).toEqual(
            UNLINK_THEN_EVERY_RESTORE_CALLS
        );
        expect(recordAuditEventMock).toHaveBeenCalledWith(
            expect.objectContaining({ changedFields: ["password"] })
        );
        expect(revokeUserSessionsMock).toHaveBeenCalledWith(OWNER_UID);
        expect(
            revokeUserSessionsMock.mock.invocationCallOrder[0]
        ).toBeGreaterThan(lastUpdateUserCallOrder());
        expect(logEventMock).toHaveBeenCalledWith(
            "account",
            "password-unlink-email-restore-failed",
            {
                uid: OWNER_UID,
                requestId: null,
                reason: "auth/internal-error",
                attempts: ADDRESS_RESTORE_ATTEMPTS,
            }
        );
        const loggedCalls = JSON.stringify(logEventMock.mock.calls);
        expect(loggedCalls).not.toContain(OWNER_EMAIL);
        expect(loggedCalls).not.toContain(restoreFailureMessage);
    });

    it("grava o mesmo requestId no log e na trilha quando a devolução do e-mail falha", async () => {
        failEveryAddressRestore();

        const response = await unlinkMethod(
            deleteRequest(OWNER_HEADERS_WITH_REQUEST_ID),
            idContext("password")
        );

        expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
        expect(recordAuditEventMock).toHaveBeenCalledWith(
            expect.objectContaining({ requestId: REQUEST_ID })
        );
        expect(logEventMock).toHaveBeenCalledWith(
            "account",
            "password-unlink-email-restore-failed",
            expect.objectContaining({ requestId: REQUEST_ID })
        );
    });

    it("imprime uma linha só, sem o e-mail, quando a devolução do e-mail falha", async () => {
        failEveryAddressRestore(`${OWNER_EMAIL}\nforged line`);
        logEventMock.mockImplementation(realLogEvent);
        const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {
            return;
        });

        await unlinkMethod(
            deleteRequest(OWNER_HEADERS_WITH_REQUEST_ID),
            idContext("password")
        );
        const printedLines = warnSpy.mock.calls.map((call) => call.join(" "));
        warnSpy.mockRestore();

        expect(printedLines).toEqual([
            `[account] password-unlink-email-restore-failed uid=${OWNER_UID} requestId=${REQUEST_ID} reason=auth/internal-error attempts=${ADDRESS_RESTORE_ATTEMPTS}`,
        ]);
    });

    it("desvincula a senha de uma conta sem e-mail sem tentar devolvê-lo e revoga as sessões", async () => {
        resolveApiActorMock.mockResolvedValue({
            ...BOTH_METHODS_USER,
            email: undefined,
            emailVerified: false,
            displayName: "Owner",
        });

        const response = await unlinkMethod(
            deleteRequest(),
            idContext("password")
        );

        expect(response.status).toBe(NO_CONTENT);
        expect(updateUserMock.mock.calls).toEqual([
            [OWNER_UID, { providersToUnlink: ["password"] }],
        ]);
        expect(recordAuditEventMock).toHaveBeenCalledWith(
            expect.objectContaining({
                changedFields: ["password"],
                targetLabel: "Owner",
            })
        );
        expect(revokeUserSessionsMock).toHaveBeenCalledWith(OWNER_UID);
        expect(logEventMock).not.toHaveBeenCalled();
    });

    it("recusa quando o titular do perfil não é quem está autenticado", async () => {
        findByReferenceIdMock.mockResolvedValue({
            ...OWNER_PROFILE,
            reference_id: "someone-else",
        });

        const response = await unlinkMethod(
            deleteRequest(),
            idContext("google.com")
        );

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await codeOf(response)).toBe(
            "AUTH_REQUEST_IMPERSONATION_FORBIDDEN"
        );
        expect(updateUserMock).not.toHaveBeenCalled();
    });

    it("recusa durante uma personificação", async () => {
        impersonateOwner();

        const response = await unlinkMethod(
            deleteRequest(IMPERSONATION_HEADERS),
            idContext("google.com")
        );

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(updateUserMock).not.toHaveBeenCalled();
        expect(recordAuditEventMock).not.toHaveBeenCalled();
    });
});

describe("POST /account/sign-in-methods/linked", () => {
    it("registra o vínculo que o Firebase já lista na conta", async () => {
        const response = await confirmLinked(
            linkedRequest({ providerId: "google.com" })
        );
        const body = (await response.json()) as {
            data: { confirmed: boolean };
        };

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(body.data.confirmed).toBe(true);
        expect(recordAuditEventMock).toHaveBeenCalledWith(
            expect.objectContaining({
                action: AuditAction.ACCOUNT_SIGN_IN_METHOD_LINK,
                actorUid: OWNER_UID,
                targetUserId: OWNER_PROFILE.id,
                changedFields: ["google.com"],
            })
        );
        expect(updateUserMock).not.toHaveBeenCalled();
    });

    it("responde 404 e não grava evento para um provedor ausente", async () => {
        resolveApiActorMock.mockResolvedValue({
            ...BOTH_METHODS_USER,
            providerData: [{ providerId: "password" }],
        });

        const response = await confirmLinked(
            linkedRequest({ providerId: "google.com" })
        );

        expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
        expect(await codeOf(response)).toBe("ACCOUNT_SIGN_IN_METHOD_NOT_FOUND");
        expect(recordAuditEventMock).not.toHaveBeenCalled();
    });

    it.each([
        [{}],
        [{ providerId: "Google" }],
        [{ providerId: "google.com", uid: "someone-else" }],
    ])("responde 400 VALIDATION_FAILED para o corpo %j", async (body) => {
        const response = await confirmLinked(linkedRequest(body));

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await codeOf(response)).toBe("VALIDATION_FAILED");
        expect(recordAuditEventMock).not.toHaveBeenCalled();
    });

    it("recusa durante uma personificação", async () => {
        impersonateOwner();

        const response = await confirmLinked(
            linkedRequest({ providerId: "google.com" }, IMPERSONATION_HEADERS)
        );

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(recordAuditEventMock).not.toHaveBeenCalled();
    });
});
