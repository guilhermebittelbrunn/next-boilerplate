import { UserRoleLevel } from "@repo/auth/types";
import { UserType } from "@repo/sdk/src/types";
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    resolveApiActorMock,
    findByReferenceIdMock,
    findByIdMock,
    deleteMock,
    findOwnedByMock,
    listByOrganizationMock,
    signInWithPasswordMock,
    runAccountErasureMock,
    recordAuditEventMock,
    revokeAccountAccessMock,
    getStripeMock,
    cancelMock,
    calls,
} = vi.hoisted(() => ({
    resolveApiActorMock: vi.fn(),
    findByReferenceIdMock: vi.fn(),
    findByIdMock: vi.fn(),
    deleteMock: vi.fn(),
    findOwnedByMock: vi.fn(),
    listByOrganizationMock: vi.fn(),
    signInWithPasswordMock: vi.fn(),
    runAccountErasureMock: vi.fn(),
    recordAuditEventMock: vi.fn(),
    revokeAccountAccessMock: vi.fn(),
    getStripeMock: vi.fn(),
    cancelMock: vi.fn(),
    calls: [] as string[],
}));

class FakeIdentityToolkitError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "IdentityToolkitError";
    }
}

vi.mock("@/(shared)/repositories/organization.repository", () => ({
    organizationRepository: {
        findOwnedBy: (...args: unknown[]) => findOwnedByMock(...args),
    },
}));

vi.mock("@/(shared)/repositories/organization-member.repository", () => ({
    organizationMemberRepository: {
        listByOrganization: (...args: unknown[]) =>
            listByOrganizationMock(...args),
        findByUserId: vi.fn(),
        createOwnerMembership: vi.fn(),
        clearLegacyClaim: vi.fn(),
    },
}));

vi.mock("@/(shared)/repositories/entity.repository", () => ({
    entityRepository: { claimUnscopedByUserId: vi.fn() },
}));

vi.mock("@/(shared)/repositories/user.repository", () => ({
    userRepository: {
        findByReferenceId: (...args: unknown[]) =>
            findByReferenceIdMock(...args),
        touchLastAccess: vi.fn(),
        findById: (...args: unknown[]) => findByIdMock(...args),
        delete: (...args: unknown[]) => {
            calls.push("delete");
            return deleteMock(...args);
        },
    },
}));

vi.mock("@/(shared)/lib/resolve-api-actor", () => ({
    resolveApiActor: (...args: unknown[]) => resolveApiActorMock(...args),
}));

vi.mock("@/(shared)/lib/firebase-identity-toolkit", () => ({
    IdentityToolkitError: FakeIdentityToolkitError,
    identitySignInWithPassword: (...args: unknown[]) =>
        signInWithPasswordMock(...args),
}));

vi.mock("@/(shared)/lib/account-erasure", () => ({
    runAccountErasure: (...args: unknown[]) => runAccountErasureMock(...args),
}));

vi.mock("@/(shared)/lib/account-access", () => ({
    revokeAccountAccess: (...args: unknown[]) => {
        calls.push("revoke");
        return revokeAccountAccessMock(...args);
    },
}));

vi.mock("@/(shared)/lib/audit-recorder", () => ({
    recordAuditEvent: (...args: unknown[]) => recordAuditEventMock(...args),
    recordImpersonationSession: vi.fn(),
}));

vi.mock("@/(shared)/lib/audit-label", () => ({
    resolveUserAuditLabel: () => Promise.resolve("owner@example.com"),
}));

vi.mock("@/(shared)/lib/user-merge", () => ({
    getMergedUserByFirestoreDocId: vi.fn(),
    getMergedUserByUid: vi.fn(),
}));

vi.mock("@repo/auth/server", () => ({
    getAuthInstance: () => ({ updateUser: vi.fn() }),
    getCurrentUser: vi.fn(),
    revokeUserSessions: vi.fn(),
}));

vi.mock("@repo/payments", () => ({
    getStripe: () => getStripeMock(),
    isPaymentsConfigured: () => true,
}));

vi.mock("@/env", () => ({
    env: { NEXT_PUBLIC_APP_URL: "http://localhost:3000" },
}));

vi.mock("@repo/shared/utils/helpers/log", () => ({
    logEvent: vi.fn(),
}));

const { POST: deleteOwnAccount } = await import(
    "@/app/(routes)/account/deletion/route"
);
const { DELETE: archiveUser } = await import("@/app/(routes)/users/[id]/route");

const OWNER_UID = "common-9";
const OWNER_EMAIL = "owner@example.com";
const OWNER_PROFILE_ID = "profile-owner";
const ADMIN_UID = "admin-1";
const ARCHIVED_MEMBER_ID = "profile-archived";
const LIVE_MEMBER_ID = "profile-live";
const SUBSCRIPTION_ID = "sub_123";
const STATUS_NO_CONTENT = 204;
const VALID_BODY = { currentPassword: "current-secret" };

const OWNER_PROFILE = {
    id: OWNER_PROFILE_ID,
    reference_id: OWNER_UID,
    type: UserType.COMMON,
    subscription: { subscriptionId: SUBSCRIPTION_ID, status: "active" },
};
const ADMIN_PROFILE = {
    id: "profile-admin",
    reference_id: ADMIN_UID,
    type: UserType.ADMIN,
};
const LIVE_MEMBER_PROFILE = {
    id: LIVE_MEMBER_ID,
    reference_id: "common-live",
    type: UserType.COMMON,
};

const DONE_REPORT = [
    { step: "billing", status: "skipped", reason: "no-subscription" },
    { step: "profile", status: "done" },
    { step: "authAccount", status: "done" },
];

function membership(userId: string, role: "owner" | "member") {
    return {
        id: userId,
        userId,
        organizationId: "org-home",
        role,
        joinedAt: "2026-10-01T00:00:00.000Z",
        legacyClaimPending: false,
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-01T00:00:00.000Z",
        deletedAt: null,
    };
}

function homeOrganizationWith(...memberIds: string[]) {
    findOwnedByMock.mockResolvedValue({
        id: "org-home",
        ownerUserId: OWNER_PROFILE_ID,
    });
    listByOrganizationMock.mockResolvedValue([
        membership(OWNER_PROFILE_ID, "owner"),
        ...memberIds.map((id) => membership(id, "member")),
    ]);
}

function profileById(id: string) {
    if (id === OWNER_PROFILE_ID) {
        return Promise.resolve(OWNER_PROFILE);
    }
    if (id === LIVE_MEMBER_ID) {
        return Promise.resolve(LIVE_MEMBER_PROFILE);
    }
    return Promise.resolve(null);
}

function headersFor(uid: string, role: UserRoleLevel) {
    return new Headers({
        [AUTH_REQUEST_HEADER.USER_ID]: uid,
        [AUTH_REQUEST_HEADER.USER_ROLE]: role,
        [AUTH_REQUEST_HEADER.REQUEST_ROLE]: role,
        [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: uid,
    });
}

function ownDeletionRequest(): NextRequest {
    return {
        method: "POST",
        url: "http://localhost:3002/account/deletion",
        headers: headersFor(OWNER_UID, UserRoleLevel.COMMON),
        json: () => Promise.resolve(VALID_BODY),
    } as unknown as NextRequest;
}

function archiveRequest(): NextRequest {
    return {
        method: "DELETE",
        url: `http://localhost:3002/users/${OWNER_PROFILE_ID}`,
        headers: headersFor(ADMIN_UID, UserRoleLevel.ADMIN),
        json: () => Promise.resolve({}),
    } as unknown as NextRequest;
}

function archiveOwner() {
    return archiveUser(archiveRequest(), {
        params: { id: OWNER_PROFILE_ID },
    });
}

async function codeOf(response: Response): Promise<string> {
    const body = (await response.json()) as { error: { code: string } };
    return body.error.code;
}

beforeEach(() => {
    for (const mock of [
        resolveApiActorMock,
        findByReferenceIdMock,
        findByIdMock,
        deleteMock,
        findOwnedByMock,
        listByOrganizationMock,
        signInWithPasswordMock,
        runAccountErasureMock,
        recordAuditEventMock,
        revokeAccountAccessMock,
        getStripeMock,
        cancelMock,
    ]) {
        mock.mockReset();
    }
    calls.length = 0;

    findByReferenceIdMock.mockImplementation((uid: string) =>
        Promise.resolve(uid === ADMIN_UID ? ADMIN_PROFILE : OWNER_PROFILE)
    );
    findByIdMock.mockImplementation(profileById);
    deleteMock.mockResolvedValue(undefined);
    signInWithPasswordMock.mockResolvedValue({ localId: OWNER_UID });
    runAccountErasureMock.mockResolvedValue(DONE_REPORT);
    recordAuditEventMock.mockResolvedValue(undefined);
    revokeAccountAccessMock.mockResolvedValue(undefined);
    cancelMock.mockImplementation(() => {
        calls.push("cancel");
        return Promise.resolve({ id: SUBSCRIPTION_ID, status: "canceled" });
    });
    getStripeMock.mockReturnValue({ subscriptions: { cancel: cancelMock } });
});

describe("POST /account/deletion com o dono de uma organização", () => {
    beforeEach(() => {
        resolveApiActorMock.mockResolvedValue({
            uid: OWNER_UID,
            email: OWNER_EMAIL,
            providerData: [{ providerId: "password", uid: OWNER_EMAIL }],
        });
    });

    it("segue para a conferência de senha quando o único outro membro tem o perfil arquivado", async () => {
        homeOrganizationWith(ARCHIVED_MEMBER_ID);

        const response = await deleteOwnAccount(ownDeletionRequest());

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(findByIdMock).toHaveBeenCalledWith(ARCHIVED_MEMBER_ID);
        expect(signInWithPasswordMock).toHaveBeenCalledWith(
            OWNER_EMAIL,
            VALID_BODY.currentPassword
        );
        expect(runAccountErasureMock).toHaveBeenCalledTimes(1);
    });

    it("recusa com 409 antes da senha quando um membro vivo continua na organização", async () => {
        homeOrganizationWith(ARCHIVED_MEMBER_ID, LIVE_MEMBER_ID);

        const response = await deleteOwnAccount(ownDeletionRequest());

        expect(response.status).toBe(HTTP_STATUS.CONFLICT);
        expect(await codeOf(response)).toBe(
            "ACCOUNT_DELETION_ORGANIZATION_HAS_MEMBERS"
        );
        expect(signInWithPasswordMock).not.toHaveBeenCalled();
        expect(runAccountErasureMock).not.toHaveBeenCalled();
    });

    it("não apaga nada quando a leitura do perfil de um membro falha", async () => {
        homeOrganizationWith(ARCHIVED_MEMBER_ID);
        findByIdMock.mockRejectedValue(new Error("firestore unavailable"));

        await expect(deleteOwnAccount(ownDeletionRequest())).rejects.toThrow(
            "firestore unavailable"
        );
        expect(signInWithPasswordMock).not.toHaveBeenCalled();
        expect(runAccountErasureMock).not.toHaveBeenCalled();
        expect(recordAuditEventMock).not.toHaveBeenCalled();
    });
});

describe("DELETE /users/[id] com o dono de uma organização", () => {
    beforeEach(() => {
        resolveApiActorMock.mockResolvedValue({
            uid: ADMIN_UID,
            email: "admin@example.com",
        });
    });

    it("arquiva o dono cujo único outro membro tem o perfil arquivado, cancelando a assinatura primeiro", async () => {
        homeOrganizationWith(ARCHIVED_MEMBER_ID);

        const response = await archiveOwner();

        expect(response.status).toBe(STATUS_NO_CONTENT);
        expect(findByIdMock).toHaveBeenCalledWith(ARCHIVED_MEMBER_ID);
        expect(cancelMock).toHaveBeenCalledWith(SUBSCRIPTION_ID);
        expect(calls).toEqual(["cancel", "revoke", "delete"]);
        expect(deleteMock).toHaveBeenCalledWith(OWNER_PROFILE_ID);
    });

    it("recusa com 409 quando um membro vivo continua na organização", async () => {
        homeOrganizationWith(ARCHIVED_MEMBER_ID, LIVE_MEMBER_ID);

        const response = await archiveOwner();

        expect(response.status).toBe(HTTP_STATUS.CONFLICT);
        expect(await codeOf(response)).toBe(
            "USERS_DELETE_ORGANIZATION_HAS_MEMBERS"
        );
        expect(getStripeMock).not.toHaveBeenCalled();
        expect(calls).toEqual([]);
    });

    it("não cancela, não revoga e não arquiva quando a leitura do perfil de um membro falha", async () => {
        homeOrganizationWith(ARCHIVED_MEMBER_ID);
        findByIdMock.mockImplementation((id: string) =>
            id === OWNER_PROFILE_ID
                ? Promise.resolve(OWNER_PROFILE)
                : Promise.reject(new Error("firestore unavailable"))
        );

        await expect(archiveOwner()).rejects.toThrow("firestore unavailable");
        expect(getStripeMock).not.toHaveBeenCalled();
        expect(revokeAccountAccessMock).not.toHaveBeenCalled();
        expect(deleteMock).not.toHaveBeenCalled();
        expect(recordAuditEventMock).not.toHaveBeenCalled();
    });
});
