import { UserRoleLevel } from "@repo/auth/types";
import { AuditAction, UserType } from "@repo/sdk/src/types";
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    resolveApiActorMock,
    findByReferenceIdMock,
    signInWithPasswordMock,
    runAccountErasureMock,
    recordAuditEventMock,
} = vi.hoisted(() => ({
    resolveApiActorMock: vi.fn(),
    findByReferenceIdMock: vi.fn(),
    signInWithPasswordMock: vi.fn(),
    runAccountErasureMock: vi.fn(),
    recordAuditEventMock: vi.fn(),
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

vi.mock("@/(shared)/lib/account-erasure", () => ({
    runAccountErasure: (...args: unknown[]) => runAccountErasureMock(...args),
}));

vi.mock("@/(shared)/lib/audit-recorder", () => ({
    recordAuditEvent: (...args: unknown[]) => recordAuditEventMock(...args),
    recordImpersonationSession: vi.fn(),
}));

const { POST: deleteAccount } = await import(
    "@/app/(routes)/account/deletion/route"
);

const OWNER_UID = "common-9";
const OWNER_EMAIL = "owner@example.com";
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
const VALID_BODY = { currentPassword: "current-secret" };

const PASSWORD_PROVIDER = [{ providerId: "password", uid: OWNER_EMAIL }];
const GOOGLE_PROVIDER = [{ providerId: "google.com", uid: "g-1" }];

const DONE_REPORT = [
    { step: "billing", status: "skipped", reason: "no-subscription" },
    { step: "storage", status: "skipped", reason: "storage-not-configured" },
    { step: "entities", status: "done", count: 2 },
    { step: "auditTrail", status: "done", count: 3 },
    { step: "profile", status: "done" },
    { step: "authAccount", status: "done" },
];

function request(body?: unknown, headers?: Record<string, string>) {
    return {
        method: "POST",
        url: "http://localhost:3002/account/deletion",
        headers: new Headers(
            headers ?? {
                [AUTH_REQUEST_HEADER.USER_ID]: OWNER_UID,
                [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.COMMON,
                [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
                [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: OWNER_UID,
            }
        ),
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
        runAccountErasureMock,
        recordAuditEventMock,
    ]) {
        mock.mockReset();
    }
    resolveApiActorMock.mockResolvedValue({
        uid: OWNER_UID,
        email: OWNER_EMAIL,
        providerData: PASSWORD_PROVIDER,
    });
    findByReferenceIdMock.mockImplementation((uid: string) =>
        Promise.resolve(uid === ADMIN_UID ? ADMIN_PROFILE : OWNER_PROFILE)
    );
    signInWithPasswordMock.mockResolvedValue({ localId: OWNER_UID });
    runAccountErasureMock.mockResolvedValue(DONE_REPORT);
    recordAuditEventMock.mockResolvedValue(undefined);
});

describe("POST /account/deletion", () => {
    it("confirma a senha antes de destruir qualquer coisa", async () => {
        const response = await deleteAccount(request(VALID_BODY));
        const body = (await response.json()) as {
            data: { confirmed: boolean };
        };

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(body.data.confirmed).toBe(true);
        expect(signInWithPasswordMock).toHaveBeenCalledWith(
            OWNER_EMAIL,
            VALID_BODY.currentPassword
        );
        expect(runAccountErasureMock).toHaveBeenCalledWith(
            expect.objectContaining({
                profile: OWNER_PROFILE,
                uid: OWNER_UID,
            })
        );
    });

    it("não apaga nada quando a senha não confere", async () => {
        signInWithPasswordMock.mockRejectedValue(
            new FakeIdentityToolkitError("INVALID_LOGIN_CREDENTIALS")
        );

        const response = await deleteAccount(request(VALID_BODY));

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await codeOf(response)).toBe("ACCOUNT_CURRENT_PASSWORD_INVALID");
        expect(runAccountErasureMock).not.toHaveBeenCalled();
    });

    it("responde 429 quando o Identity Toolkit barra por excesso de tentativas", async () => {
        signInWithPasswordMock.mockRejectedValue(
            new FakeIdentityToolkitError("TOO_MANY_ATTEMPTS_TRY_LATER")
        );

        const response = await deleteAccount(request(VALID_BODY));

        expect(response.status).toBe(HTTP_STATUS.TOO_MANY_REQUESTS);
        expect(await codeOf(response)).toBe("USERS_AUTH_RATE_LIMITED");
        expect(runAccountErasureMock).not.toHaveBeenCalled();
    });

    it("recusa a conta que só entra pelo Google, sem senha para reautenticar", async () => {
        resolveApiActorMock.mockResolvedValue({
            uid: OWNER_UID,
            email: OWNER_EMAIL,
            providerData: GOOGLE_PROVIDER,
        });

        const response = await deleteAccount(request(VALID_BODY));

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await codeOf(response)).toBe(
            "ACCOUNT_DELETION_REAUTH_UNSUPPORTED"
        );
        expect(signInWithPasswordMock).not.toHaveBeenCalled();
        expect(runAccountErasureMock).not.toHaveBeenCalled();
    });

    it("recusa a conta sem e-mail no registro de Auth", async () => {
        resolveApiActorMock.mockResolvedValue({
            uid: OWNER_UID,
            email: undefined,
            providerData: PASSWORD_PROVIDER,
        });

        const response = await deleteAccount(request(VALID_BODY));

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await codeOf(response)).toBe("ACCOUNT_PASSWORD_UNSUPPORTED");
        expect(runAccountErasureMock).not.toHaveBeenCalled();
    });

    it("recusa um corpo sem senha com o código próprio da confirmação", async () => {
        const response = await deleteAccount(request({}));

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await codeOf(response)).toBe(
            "ACCOUNT_DELETION_CONFIRMATION_INVALID"
        );
        expect(signInWithPasswordMock).not.toHaveBeenCalled();
    });

    it("recusa um uid no corpo em vez de apagar a conta de outra pessoa", async () => {
        const response = await deleteAccount(
            request({ ...VALID_BODY, uid: "someone-else" })
        );

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await codeOf(response)).toBe(
            "ACCOUNT_DELETION_CONFIRMATION_INVALID"
        );
        expect(runAccountErasureMock).not.toHaveBeenCalled();
    });

    it("grava o evento de exclusão sem rótulo, para não reintroduzir o e-mail", async () => {
        await deleteAccount(request(VALID_BODY));

        expect(recordAuditEventMock).toHaveBeenCalledWith(
            expect.objectContaining({
                action: AuditAction.ACCOUNT_DELETE,
                actorLabel: null,
                targetLabel: null,
            })
        );
    });

    it("reporta falha quando a conta de Auth sobreviveu ao expurgo", async () => {
        runAccountErasureMock.mockResolvedValue([
            ...DONE_REPORT.slice(0, -1),
            { step: "authAccount", status: "failed", reason: "Error" },
        ]);

        const response = await deleteAccount(request(VALID_BODY));

        expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
        expect(await codeOf(response)).toBe("ACCOUNT_DELETION_FAILED");
        expect(recordAuditEventMock).not.toHaveBeenCalled();
    });

    it("responde 503 sem gravar a exclusão quando a assinatura não foi cancelada", async () => {
        runAccountErasureMock.mockResolvedValue([
            {
                step: "billing",
                status: "failed",
                reason: "StripeConnectionError",
            },
            ...DONE_REPORT.slice(1).map((step) => ({
                step: step.step,
                status: "skipped",
                reason: "billing-failed",
            })),
        ]);

        const response = await deleteAccount(request(VALID_BODY));

        expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
        expect(await codeOf(response)).toBe("ACCOUNT_DELETION_BILLING_FAILED");
        expect(recordAuditEventMock).not.toHaveBeenCalled();
    });

    it("recusa a exclusão durante uma personificação, antes de ler o corpo", async () => {
        resolveApiActorMock.mockResolvedValue({
            uid: ADMIN_UID,
            email: "admin@example.com",
            providerData: PASSWORD_PROVIDER,
        });

        const response = await deleteAccount(
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
        expect(runAccountErasureMock).not.toHaveBeenCalled();
    });

    it("recusa quando o perfil em contexto não é o dono da sessão", async () => {
        findByReferenceIdMock.mockResolvedValue({
            ...OWNER_PROFILE,
            reference_id: "outra-pessoa",
        });

        const response = await deleteAccount(request(VALID_BODY));

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await codeOf(response)).toBe(
            "AUTH_REQUEST_IMPERSONATION_FORBIDDEN"
        );
        expect(signInWithPasswordMock).not.toHaveBeenCalled();
        expect(runAccountErasureMock).not.toHaveBeenCalled();
    });

    it("recusa quem não apresenta credencial", async () => {
        resolveApiActorMock.mockResolvedValue(null);

        const response = await deleteAccount(request(VALID_BODY));

        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
        expect(runAccountErasureMock).not.toHaveBeenCalled();
    });
});
