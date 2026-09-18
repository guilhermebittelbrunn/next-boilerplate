import { UserRoleLevel } from "@repo/auth/types";
import { AuditAction, AuditTargetType, UserType } from "@repo/sdk/src/types";
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
    recordAuditEventMock,
} = vi.hoisted(() => ({
    resolveApiActorMock: vi.fn(),
    findByReferenceIdMock: vi.fn(),
    signInWithPasswordMock: vi.fn(),
    updateUserMock: vi.fn(),
    revokeUserSessionsMock: vi.fn(),
    recordAuditEventMock: vi.fn(),
}));

class FakeIdentityToolkitError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "IdentityToolkitError";
    }
}

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
const CURRENT_PASSWORD = "current-secret";
const NEW_PASSWORD = "brand-new-secret";
const VALID_BODY = {
    currentPassword: CURRENT_PASSWORD,
    password: NEW_PASSWORD,
};

function request(body: unknown, path: string): NextRequest {
    return {
        method: "POST",
        url: `http://localhost:3002${path}`,
        headers: new Headers({
            [AUTH_REQUEST_HEADER.USER_ID]: OWNER_UID,
            [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.COMMON,
            [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
            [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: OWNER_UID,
            "x-request-id": "req-77",
        }),
        json: () => Promise.resolve(body ?? {}),
    } as unknown as NextRequest;
}

const passwordRequest = (body: unknown = VALID_BODY) =>
    request(body, "/account/password");
const revokeRequest = () => request({}, "/account/sessions/revoke");

function recordedEvent() {
    return recordAuditEventMock.mock.calls[0]?.[0];
}

beforeEach(() => {
    for (const mock of [
        resolveApiActorMock,
        findByReferenceIdMock,
        signInWithPasswordMock,
        updateUserMock,
        revokeUserSessionsMock,
        recordAuditEventMock,
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
    revokeUserSessionsMock.mockResolvedValue(undefined);
    recordAuditEventMock.mockResolvedValue(undefined);
});

describe("POST /account/password leaves a trail", () => {
    it("records the change with the account holder as actor and target", async () => {
        await changePassword(passwordRequest());

        expect(recordedEvent()).toMatchObject({
            action: AuditAction.ACCOUNT_PASSWORD_CHANGE,
            actorUserId: OWNER_PROFILE.id,
            actorUid: OWNER_UID,
            actorLabel: OWNER_EMAIL,
            targetType: AuditTargetType.ACCOUNT,
            targetUserId: OWNER_PROFILE.id,
            targetLabel: OWNER_EMAIL,
            requestId: "req-77",
        });
    });

    it("keeps every password out of the recorded event", async () => {
        await changePassword(passwordRequest());

        const serialized = JSON.stringify(recordedEvent());
        expect(serialized).not.toContain(CURRENT_PASSWORD);
        expect(serialized).not.toContain(NEW_PASSWORD);
    });

    it("records nothing when the current password does not check out", async () => {
        signInWithPasswordMock.mockRejectedValue(
            new FakeIdentityToolkitError("INVALID_LOGIN_CREDENTIALS")
        );

        const response = await changePassword(passwordRequest());

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(recordAuditEventMock).not.toHaveBeenCalled();
    });

    it("records nothing when Firebase refuses to store the new password", async () => {
        updateUserMock.mockRejectedValue(new Error("auth is down"));

        const response = await changePassword(passwordRequest());

        expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
        expect(recordAuditEventMock).not.toHaveBeenCalled();
    });

    it("records nothing for a caller without credentials", async () => {
        resolveApiActorMock.mockResolvedValue(null);

        await changePassword(passwordRequest());

        expect(recordAuditEventMock).not.toHaveBeenCalled();
    });

    it("records the change only after the sessions are dropped", async () => {
        const order: string[] = [];
        revokeUserSessionsMock.mockImplementation(() => {
            order.push("revoke");
            return Promise.resolve();
        });
        recordAuditEventMock.mockImplementation(() => {
            order.push("record");
            return Promise.resolve();
        });

        await changePassword(passwordRequest());

        expect(order).toEqual(["revoke", "record"]);
    });
});

describe("POST /account/sessions/revoke leaves a trail", () => {
    it("records the revocation with the account holder as actor and target", async () => {
        await revokeSessions(revokeRequest());

        expect(recordedEvent()).toMatchObject({
            action: AuditAction.ACCOUNT_SESSIONS_REVOKE,
            actorUserId: OWNER_PROFILE.id,
            actorUid: OWNER_UID,
            actorLabel: OWNER_EMAIL,
            targetType: AuditTargetType.SESSION,
            targetUserId: OWNER_PROFILE.id,
            targetLabel: OWNER_EMAIL,
            requestId: "req-77",
        });
    });

    it("records the revocation after the sessions are actually dropped", async () => {
        const order: string[] = [];
        revokeUserSessionsMock.mockImplementation(() => {
            order.push("revoke");
            return Promise.resolve();
        });
        recordAuditEventMock.mockImplementation(() => {
            order.push("record");
            return Promise.resolve();
        });

        await revokeSessions(revokeRequest());

        expect(order).toEqual(["revoke", "record"]);
    });

    it("falls back to the display name when the account has no email", async () => {
        resolveApiActorMock.mockResolvedValue({
            uid: OWNER_UID,
            email: undefined,
            displayName: "Sem E-mail",
        });

        await revokeSessions(revokeRequest());

        expect(recordedEvent().actorLabel).toBe("Sem E-mail");
    });

    it("records nothing for a caller without credentials", async () => {
        resolveApiActorMock.mockResolvedValue(null);

        await revokeSessions(revokeRequest());

        expect(recordAuditEventMock).not.toHaveBeenCalled();
    });

    it("records nothing when an admin tries it while impersonating", async () => {
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
        expect(recordAuditEventMock).not.toHaveBeenCalled();
    });
});
