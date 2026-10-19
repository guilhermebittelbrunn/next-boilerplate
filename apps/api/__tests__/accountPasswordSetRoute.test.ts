import { UserRoleLevel } from "@repo/auth/types";
import { AuditAction, AuditTargetType, UserType } from "@repo/sdk/src/types";
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { PASSWORD_MIN_LENGTH } from "@repo/shared/utils/helpers/passwordPolicy";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    resolveApiActorMock,
    findByReferenceIdMock,
    updateUserMock,
    revokeUserSessionsMock,
    verifyIdTokenClaimsMock,
    recordAuditEventMock,
} = vi.hoisted(() => ({
    resolveApiActorMock: vi.fn(),
    findByReferenceIdMock: vi.fn(),
    updateUserMock: vi.fn(),
    revokeUserSessionsMock: vi.fn(),
    verifyIdTokenClaimsMock: vi.fn(),
    recordAuditEventMock: vi.fn(),
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
        update: vi.fn(),
    },
}));

vi.mock("@repo/auth/server", () => ({
    getAuthInstance: () => ({ updateUser: updateUserMock }),
    revokeUserSessions: (...args: unknown[]) => revokeUserSessionsMock(...args),
    verifyIdTokenClaims: (...args: unknown[]) =>
        verifyIdTokenClaimsMock(...args),
}));

const { POST: setPassword } = await import(
    "@/app/(routes)/account/password/set/route"
);

const OWNER_UID = "google-only-1";
const OWNER_EMAIL = "owner@example.com";
const OWNER_PROFILE = {
    id: "profile-1",
    reference_id: OWNER_UID,
    type: UserType.COMMON,
};
const GOOGLE_ONLY_USER = {
    uid: OWNER_UID,
    email: OWNER_EMAIL,
    providerData: [{ providerId: "google.com", email: OWNER_EMAIL }],
};
const MILLISECONDS_IN_A_SECOND = 1000;
const FRESH_SIGN_IN_AGE_SECONDS = 5;
const STALE_SIGN_IN_AGE_SECONDS = 600;

const nowSeconds = () => Math.floor(Date.now() / MILLISECONDS_IN_A_SECOND);

const VALID_BODY = {
    reauthIdToken: "fresh-google-token",
    password: "brand-new-secret",
};

function request(body?: unknown, headers?: Record<string, string>) {
    return {
        method: "POST",
        url: "http://localhost:3002/account/password/set",
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

function nothingWritten() {
    return [updateUserMock, revokeUserSessionsMock, recordAuditEventMock].every(
        (mock) => mock.mock.calls.length === 0
    );
}

beforeEach(() => {
    for (const mock of [
        resolveApiActorMock,
        findByReferenceIdMock,
        updateUserMock,
        revokeUserSessionsMock,
        verifyIdTokenClaimsMock,
        recordAuditEventMock,
    ]) {
        mock.mockReset();
    }
    resolveApiActorMock.mockResolvedValue({ ...GOOGLE_ONLY_USER });
    findByReferenceIdMock.mockResolvedValue({ ...OWNER_PROFILE });
    updateUserMock.mockResolvedValue({ uid: OWNER_UID });
    verifyIdTokenClaimsMock.mockResolvedValue({
        uid: OWNER_UID,
        auth_time: nowSeconds() - FRESH_SIGN_IN_AGE_SECONDS,
        firebase: { sign_in_provider: "google.com" },
    });
});

describe("POST /account/password/set", () => {
    it("define a senha, encerra todas as sessões e registra na trilha", async () => {
        const response = await setPassword(request(VALID_BODY));
        const body = (await response.json()) as {
            data: { confirmed: boolean };
        };

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(body.data.confirmed).toBe(true);
        expect(verifyIdTokenClaimsMock).toHaveBeenCalledWith(
            VALID_BODY.reauthIdToken
        );
        expect(updateUserMock).toHaveBeenCalledWith(OWNER_UID, {
            email: OWNER_EMAIL,
            password: VALID_BODY.password,
        });
        expect(revokeUserSessionsMock).toHaveBeenCalledWith(OWNER_UID);
        expect(recordAuditEventMock).toHaveBeenCalledWith(
            expect.objectContaining({
                action: AuditAction.ACCOUNT_PASSWORD_SET,
                actorUserId: OWNER_PROFILE.id,
                actorUid: OWNER_UID,
                actorLabel: OWNER_EMAIL,
                targetType: AuditTargetType.ACCOUNT,
                targetUserId: OWNER_PROFILE.id,
                targetLabel: OWNER_EMAIL,
            })
        );
    });

    it("usa o e-mail do Google quando a conta não tem mais o endereço", async () => {
        resolveApiActorMock.mockResolvedValue({
            ...GOOGLE_ONLY_USER,
            email: undefined,
        });

        const response = await setPassword(request(VALID_BODY));

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(updateUserMock).toHaveBeenCalledWith(OWNER_UID, {
            email: OWNER_EMAIL,
            password: VALID_BODY.password,
        });
    });

    it("recusa com 409 uma conta que já tem senha", async () => {
        resolveApiActorMock.mockResolvedValue({
            ...GOOGLE_ONLY_USER,
            providerData: [
                { providerId: "google.com" },
                { providerId: "password" },
            ],
        });

        const response = await setPassword(request(VALID_BODY));

        expect(response.status).toBe(HTTP_STATUS.CONFLICT);
        expect(await codeOf(response)).toBe("ACCOUNT_PASSWORD_ALREADY_SET");
        expect(verifyIdTokenClaimsMock).not.toHaveBeenCalled();
        expect(nothingWritten()).toBe(true);
    });

    it.each([
        ["de outra conta", { uid: "someone-else" }],
        [
            "do bootstrap da sessão",
            { firebase: { sign_in_provider: "custom" } },
        ],
        ["de login com senha", { firebase: { sign_in_provider: "password" } }],
        ["antigo", { auth_time: nowSeconds() - STALE_SIGN_IN_AGE_SECONDS }],
    ])(
        "responde 400 ACCOUNT_REAUTH_INVALID para um token %s",
        async (_label, overrides) => {
            verifyIdTokenClaimsMock.mockResolvedValue({
                uid: OWNER_UID,
                auth_time: nowSeconds() - FRESH_SIGN_IN_AGE_SECONDS,
                firebase: { sign_in_provider: "google.com" },
                ...overrides,
            });

            const response = await setPassword(request(VALID_BODY));

            expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
            expect(await codeOf(response)).toBe("ACCOUNT_REAUTH_INVALID");
            expect(nothingWritten()).toBe(true);
        }
    );

    it("responde 400 ACCOUNT_REAUTH_INVALID para um token que não verifica", async () => {
        verifyIdTokenClaimsMock.mockResolvedValue(null);

        const response = await setPassword(request(VALID_BODY));

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await codeOf(response)).toBe("ACCOUNT_REAUTH_INVALID");
        expect(nothingWritten()).toBe(true);
    });

    it("recusa a senha curta antes de conferir o token", async () => {
        const response = await setPassword(
            request({
                reauthIdToken: "fresh-google-token",
                password: "a".repeat(PASSWORD_MIN_LENGTH - 1),
            })
        );

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await codeOf(response)).toBe("AUTH_PASSWORD_TOO_SHORT");
        expect(verifyIdTokenClaimsMock).not.toHaveBeenCalled();
        expect(nothingWritten()).toBe(true);
    });

    it("recusa um token ausente com VALIDATION_FAILED", async () => {
        const response = await setPassword(
            request({ password: VALID_BODY.password })
        );

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await codeOf(response)).toBe("VALIDATION_FAILED");
        expect(nothingWritten()).toBe(true);
    });

    it("recusa um uid no corpo em vez de definir a senha de outra conta", async () => {
        const response = await setPassword(
            request({ ...VALID_BODY, uid: "someone-else" })
        );

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await codeOf(response)).toBe("VALIDATION_FAILED");
        expect(nothingWritten()).toBe(true);
    });

    it("recusa quando nem a conta nem os provedores têm e-mail", async () => {
        resolveApiActorMock.mockResolvedValue({
            ...GOOGLE_ONLY_USER,
            email: undefined,
            providerData: [{ providerId: "google.com" }],
        });

        const response = await setPassword(request(VALID_BODY));

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await codeOf(response)).toBe("ACCOUNT_PASSWORD_UNSUPPORTED");
        expect(nothingWritten()).toBe(true);
    });

    it("responde 500 e não encerra sessões quando o Firebase recusa a gravação", async () => {
        updateUserMock.mockRejectedValue(new Error("auth is down"));

        const response = await setPassword(request(VALID_BODY));

        expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
        expect(await codeOf(response)).toBe("ACCOUNT_UPDATE_FAILED");
        expect(revokeUserSessionsMock).not.toHaveBeenCalled();
        expect(recordAuditEventMock).not.toHaveBeenCalled();
    });

    it("recusa quando o titular do perfil não é quem está autenticado", async () => {
        findByReferenceIdMock.mockResolvedValue({
            ...OWNER_PROFILE,
            reference_id: "someone-else",
        });

        const response = await setPassword(request(VALID_BODY));

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await codeOf(response)).toBe(
            "AUTH_REQUEST_IMPERSONATION_FORBIDDEN"
        );
        expect(nothingWritten()).toBe(true);
    });

    it("recusa durante uma personificação", async () => {
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

        const response = await setPassword(
            request(VALID_BODY, {
                [AUTH_REQUEST_HEADER.USER_ID]: "admin-1",
                [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.ADMIN,
                [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
                [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: OWNER_UID,
            })
        );

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(nothingWritten()).toBe(true);
    });

    it("recusa quem não apresenta credencial", async () => {
        resolveApiActorMock.mockResolvedValue(null);

        const response = await setPassword(request(VALID_BODY));

        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
        expect(nothingWritten()).toBe(true);
    });
});
