import { AuditAction, AuditTargetType } from "@repo/sdk/src/types";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    identityCheckOobCodeMock,
    identityApplyOobCodeMock,
    revokeUserSessionsMock,
    findByReferenceIdMock,
    recordAuditEventMock,
    logEventMock,
} = vi.hoisted(() => ({
    identityCheckOobCodeMock: vi.fn(),
    identityApplyOobCodeMock: vi.fn(),
    revokeUserSessionsMock: vi.fn(),
    findByReferenceIdMock: vi.fn(),
    recordAuditEventMock: vi.fn(),
    logEventMock: vi.fn(),
}));

class FakeToolkitError extends Error {}

vi.mock("@/(shared)/lib/firebase-identity-toolkit", () => ({
    IdentityToolkitError: FakeToolkitError,
    identityCheckOobCode: (...args: unknown[]) =>
        identityCheckOobCodeMock(...args),
    identityApplyOobCode: (...args: unknown[]) =>
        identityApplyOobCodeMock(...args),
}));

vi.mock("@repo/auth/server", () => ({
    revokeUserSessions: (...args: unknown[]) => revokeUserSessionsMock(...args),
}));

vi.mock("@/(shared)/repositories/user.repository", () => ({
    userRepository: {
        findByReferenceId: (...args: unknown[]) =>
            findByReferenceIdMock(...args),
    },
}));

vi.mock("@/(shared)/lib/audit-recorder", () => ({
    recordAuditEvent: (...args: unknown[]) => recordAuditEventMock(...args),
}));

vi.mock("@repo/shared/utils/helpers/log", () => ({
    logEvent: (...args: unknown[]) => logEventMock(...args),
}));

const { POST: confirmEmailChange } = await import(
    "@/app/(routes)/auth/email-change/confirm/route"
);

const UID = "uid-1";
const OLD_EMAIL = "owner@example.com";
const NEW_EMAIL = "owner.new@example.com";
const PROFILE = { id: "profile-1", reference_id: UID };
const REQUEST_ID = "req-123";
const OOB_CODE_MAX = 2048;

function post(body: unknown) {
    return confirmEmailChange(
        new Request("http://localhost:3002/auth/email-change/confirm", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-request-id": REQUEST_ID,
            },
            body: JSON.stringify(body),
        })
    );
}

async function codeOf(response: Response): Promise<string> {
    const body = (await response.json()) as { error: { code: string } };
    return body.error.code;
}

beforeEach(() => {
    vi.clearAllMocks();
    identityCheckOobCodeMock.mockResolvedValue({
        requestType: "VERIFY_AND_CHANGE_EMAIL",
        email: OLD_EMAIL,
        newEmail: NEW_EMAIL,
    });
    identityApplyOobCodeMock.mockResolvedValue({
        localId: UID,
        email: NEW_EMAIL,
        emailVerified: true,
        newEmail: NEW_EMAIL,
    });
    revokeUserSessionsMock.mockResolvedValue(undefined);
    findByReferenceIdMock.mockResolvedValue(PROFILE);
    recordAuditEventMock.mockResolvedValue(undefined);
});

describe("POST /auth/email-change/confirm", () => {
    it("aplica o código, encerra as sessões do localId e grava a troca na trilha", async () => {
        const response = await post({ oobCode: "code-1" });
        const body = (await response.json()) as {
            data: { confirmed: boolean };
        };

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(body.data.confirmed).toBe(true);
        expect(identityCheckOobCodeMock).toHaveBeenCalledWith("code-1");
        expect(identityApplyOobCodeMock).toHaveBeenCalledWith("code-1");
        expect(revokeUserSessionsMock).toHaveBeenCalledWith(UID);
        expect(findByReferenceIdMock).toHaveBeenCalledWith(UID);
        expect(recordAuditEventMock).toHaveBeenCalledWith({
            action: AuditAction.ACCOUNT_EMAIL_CHANGE,
            actorUserId: PROFILE.id,
            actorUid: UID,
            actorLabel: OLD_EMAIL,
            targetType: AuditTargetType.ACCOUNT,
            targetUserId: PROFILE.id,
            targetLabel: NEW_EMAIL,
            changedFields: ["email"],
            requestId: REQUEST_ID,
        });
    });

    it.each(["VERIFY_EMAIL", "PASSWORD_RESET"])(
        "recusa um código %s sem aplicá-lo",
        async (requestType) => {
            identityCheckOobCodeMock.mockResolvedValue({
                requestType,
                email: OLD_EMAIL,
            });

            const response = await post({ oobCode: "code-1" });

            expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
            expect(await codeOf(response)).toBe("AUTH_OOB_CODE_INVALID");
            expect(identityApplyOobCodeMock).not.toHaveBeenCalled();
            expect(revokeUserSessionsMock).not.toHaveBeenCalled();
            expect(recordAuditEventMock).not.toHaveBeenCalled();
        }
    );

    it.each([
        ["EXPIRED_OOB_CODE", "AUTH_OOB_CODE_EXPIRED"],
        ["INVALID_OOB_CODE", "AUTH_OOB_CODE_INVALID"],
        ["SOMETHING_ELSE", "AUTH_EMAIL_CHANGE_FAILED"],
    ])(
        "mapeia %s na conferência para %s sem aplicar",
        async (message, code) => {
            identityCheckOobCodeMock.mockRejectedValue(
                new FakeToolkitError(message)
            );

            const response = await post({ oobCode: "code-1" });

            expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
            expect(await codeOf(response)).toBe(code);
            expect(identityApplyOobCodeMock).not.toHaveBeenCalled();
        }
    );

    it.each([
        ["EMAIL_EXISTS", "USERS_AUTH_EMAIL_ALREADY_IN_USE"],
        ["INVALID_OOB_CODE", "AUTH_OOB_CODE_INVALID"],
        ["EXPIRED_OOB_CODE", "AUTH_OOB_CODE_EXPIRED"],
    ])(
        "mapeia %s na aplicação para %s sem revogar nem gravar",
        async (message, code) => {
            identityApplyOobCodeMock.mockRejectedValue(
                new FakeToolkitError(message)
            );

            const response = await post({ oobCode: "code-1" });

            expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
            expect(await codeOf(response)).toBe(code);
            expect(revokeUserSessionsMock).not.toHaveBeenCalled();
            expect(recordAuditEventMock).not.toHaveBeenCalled();
        }
    );

    it("responde 429 quando o toolkit barra por excesso de tentativas", async () => {
        identityCheckOobCodeMock.mockRejectedValue(
            new FakeToolkitError("TOO_MANY_ATTEMPTS_TRY_LATER")
        );

        const response = await post({ oobCode: "code-1" });

        expect(response.status).toBe(HTTP_STATUS.TOO_MANY_REQUESTS);
        expect(await codeOf(response)).toBe("USERS_AUTH_RATE_LIMITED");
    });

    it("responde 200 sem evento quando o perfil não existe, com log sem endereço", async () => {
        findByReferenceIdMock.mockResolvedValue(null);

        const response = await post({ oobCode: "code-1" });

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(revokeUserSessionsMock).toHaveBeenCalledWith(UID);
        expect(recordAuditEventMock).not.toHaveBeenCalled();
        expect(logEventMock).toHaveBeenCalledWith(
            "account",
            "email-change-audit-skipped",
            expect.any(Object)
        );
        const logged = JSON.stringify(logEventMock.mock.calls);
        expect(logged).not.toContain(OLD_EMAIL);
        expect(logged).not.toContain(NEW_EMAIL);
    });

    it("responde 200 quando a leitura do perfil falha depois da troca", async () => {
        findByReferenceIdMock.mockRejectedValue(new Error("firestore down"));

        const response = await post({ oobCode: "code-1" });

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(recordAuditEventMock).not.toHaveBeenCalled();
    });

    it.each([
        ["sem código", {}],
        ["código vazio", { oobCode: "   " }],
        ["código longo demais", { oobCode: "x".repeat(OOB_CODE_MAX + 1) }],
    ])("recusa o corpo %s com VALIDATION_FAILED", async (_label, body) => {
        const response = await post(body);

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await codeOf(response)).toBe("VALIDATION_FAILED");
        expect(identityCheckOobCodeMock).not.toHaveBeenCalled();
    });
});
