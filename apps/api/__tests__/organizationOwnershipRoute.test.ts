import { UserRoleLevel } from "@repo/auth/types";
import { UserType } from "@repo/sdk/src/types";
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    envMock,
    resolveApiActorMock,
    findByReferenceIdMock,
    resolveMembershipMock,
    transferOwnershipMock,
    getUserMock,
    recordAuditEventMock,
} = vi.hoisted(() => ({
    envMock: {
        NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED: "true" as string | undefined,
    },
    resolveApiActorMock: vi.fn(),
    findByReferenceIdMock: vi.fn(),
    resolveMembershipMock: vi.fn(),
    transferOwnershipMock: vi.fn(),
    getUserMock: vi.fn(),
    recordAuditEventMock: vi.fn(),
}));

vi.mock("@/env", () => ({ env: envMock }));
vi.mock("@/(shared)/lib/billing", () => ({ isBillingEnabled: () => false }));

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

vi.mock("@/(shared)/lib/organization-membership", () => ({
    resolveOrganizationMembership: (...args: unknown[]) =>
        resolveMembershipMock(...args),
}));

vi.mock("@repo/auth/server", () => ({
    getAuthInstance: () => ({
        getUser: (...args: unknown[]) => getUserMock(...args),
    }),
}));

vi.mock("@/(shared)/repositories/organization-member.repository", () => ({
    organizationMemberRepository: {
        transferOwnership: (...args: unknown[]) =>
            transferOwnershipMock(...args),
    },
}));

const { POST: TRANSFER } = await import(
    "@/app/(routes)/organization/members/[id]/ownership/route"
);

const ORGANIZATION_ID = "org-1";
const OWNER_UID = "owner-uid";
const OWNER_EMAIL = "owner@example.com";
const OWNER_PROFILE = {
    id: "owner-profile",
    reference_id: OWNER_UID,
    type: UserType.COMMON,
};
const TARGET_ID = "member-b";
const TARGET_UID = "member-b-uid";
const TARGET_EMAIL = "qa-ownership-transfer@example.com";
const ADMIN_UID = "admin-uid";
const REQUEST_ID = "req-transfer";

function request(actorUid = OWNER_UID): NextRequest {
    const isAdmin = actorUid === ADMIN_UID;
    return {
        method: "POST",
        url: `http://localhost:3002/organization/members/${TARGET_ID}/ownership`,
        headers: new Headers({
            [AUTH_REQUEST_HEADER.USER_ID]: actorUid,
            [AUTH_REQUEST_HEADER.USER_ROLE]: isAdmin
                ? UserRoleLevel.ADMIN
                : UserRoleLevel.COMMON,
            [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
            [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: OWNER_UID,
            "x-request-id": REQUEST_ID,
        }),
        json: () => Promise.resolve({}),
    } as unknown as NextRequest;
}

const contextFor = (id: string) => ({ params: { id } });

async function codeOf(response: Response): Promise<string> {
    const body = (await response.json()) as { error: { code: string } };
    return body.error.code;
}

function asRole(role: "owner" | "member") {
    resolveMembershipMock.mockResolvedValue({
        organizationId: ORGANIZATION_ID,
        role,
    });
}

beforeEach(() => {
    for (const mock of [
        resolveApiActorMock,
        findByReferenceIdMock,
        resolveMembershipMock,
        transferOwnershipMock,
        getUserMock,
        recordAuditEventMock,
    ]) {
        mock.mockReset();
    }
    envMock.NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED = "true";
    resolveApiActorMock.mockResolvedValue({
        uid: OWNER_UID,
        email: OWNER_EMAIL,
    });
    findByReferenceIdMock.mockImplementation((uid: string) =>
        Promise.resolve(
            uid === ADMIN_UID
                ? { id: "admin", reference_id: ADMIN_UID, type: UserType.ADMIN }
                : OWNER_PROFILE
        )
    );
    asRole("owner");
    transferOwnershipMock.mockResolvedValue({
        status: "transferred",
        targetReferenceId: TARGET_UID,
    });
    getUserMock.mockResolvedValue({ uid: TARGET_UID, email: TARGET_EMAIL });
});

describe("POST /organization/members/:id/ownership", () => {
    it("hands ownership to the member and answers the new owner", async () => {
        const response = await TRANSFER(request(), contextFor(TARGET_ID));

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(await response.json()).toEqual({
            data: { ownerUserId: TARGET_ID },
        });
        expect(transferOwnershipMock).toHaveBeenCalledTimes(1);
        expect(transferOwnershipMock).toHaveBeenCalledWith({
            organizationId: ORGANIZATION_ID,
            fromUserId: OWNER_PROFILE.id,
            toUserId: TARGET_ID,
            now: expect.any(Date),
        });
    });

    it("records the transfer with both people labelled", async () => {
        await TRANSFER(request(), contextFor(TARGET_ID));

        expect(getUserMock).toHaveBeenCalledWith(TARGET_UID);
        expect(recordAuditEventMock).toHaveBeenCalledTimes(1);
        expect(recordAuditEventMock).toHaveBeenCalledWith({
            action: "organization.ownership.transfer",
            actorUserId: OWNER_PROFILE.id,
            actorUid: OWNER_UID,
            actorLabel: OWNER_EMAIL,
            targetType: "user",
            targetUserId: TARGET_ID,
            targetLabel: TARGET_EMAIL,
            requestId: REQUEST_ID,
        });
    });

    it("records the transfer without a target label when the profile has no uid", async () => {
        transferOwnershipMock.mockResolvedValue({
            status: "transferred",
            targetReferenceId: null,
        });

        const response = await TRANSFER(request(), contextFor(TARGET_ID));

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(getUserMock).not.toHaveBeenCalled();
        expect(recordAuditEventMock).toHaveBeenCalledWith(
            expect.objectContaining({ targetLabel: null })
        );
    });

    it("refuses the owner's own id with 400, without opening a transaction", async () => {
        const response = await TRANSFER(
            request(),
            contextFor(OWNER_PROFILE.id)
        );

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await codeOf(response)).toBe(
            "ORGANIZATION_OWNERSHIP_TARGET_SELF"
        );
        expect(transferOwnershipMock).not.toHaveBeenCalled();
        expect(recordAuditEventMock).not.toHaveBeenCalled();
    });

    it.each(["a/b", "__reserved__", ".."])(
        "answers 404 to the unusable id %j without touching Firestore",
        async (id) => {
            const response = await TRANSFER(request(), contextFor(id));

            expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
            expect(await codeOf(response)).toBe(
                "ORGANIZATION_MEMBER_NOT_FOUND"
            );
            expect(transferOwnershipMock).not.toHaveBeenCalled();
        }
    );

    it.each([
        ["forbidden", HTTP_STATUS.FORBIDDEN, "ORGANIZATION_FORBIDDEN"],
        ["not-member", HTTP_STATUS.NOT_FOUND, "ORGANIZATION_MEMBER_NOT_FOUND"],
        [
            "target-archived",
            HTTP_STATUS.CONFLICT,
            "ORGANIZATION_OWNERSHIP_TARGET_ARCHIVED",
        ],
    ] as const)(
        "maps %s to %i %s and records nothing",
        async (status, httpStatus, code) => {
            transferOwnershipMock.mockResolvedValue({ status });

            const response = await TRANSFER(request(), contextFor(TARGET_ID));

            expect(response.status).toBe(httpStatus);
            expect(await codeOf(response)).toBe(code);
            expect(recordAuditEventMock).not.toHaveBeenCalled();
        }
    );

    it("refuses a member with 403", async () => {
        asRole("member");

        const response = await TRANSFER(request(), contextFor(TARGET_ID));

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await codeOf(response)).toBe("ORGANIZATION_FORBIDDEN");
        expect(transferOwnershipMock).not.toHaveBeenCalled();
    });

    it("refuses an admin acting as the owner: transferring is a write", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: ADMIN_UID });

        const response = await TRANSFER(
            request(ADMIN_UID),
            contextFor(TARGET_ID)
        );

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await codeOf(response)).toBe(
            "AUTH_REQUEST_IMPERSONATION_READ_ONLY"
        );
        expect(transferOwnershipMock).not.toHaveBeenCalled();
    });

    it("refuses without a session", async () => {
        resolveApiActorMock.mockResolvedValue(null);

        const response = await TRANSFER(request(), contextFor(TARGET_ID));

        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
        expect(await codeOf(response)).toBe("AUTH_INVALID_TOKEN");
        expect(transferOwnershipMock).not.toHaveBeenCalled();
    });

    it.each(["", "false", undefined])(
        "answers 404 with members switched off (%j), before authenticating",
        async (value) => {
            envMock.NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED = value;

            const response = await TRANSFER(request(), contextFor(TARGET_ID));

            expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
            expect(await codeOf(response)).toBe(
                "ORGANIZATION_MEMBERS_DISABLED"
            );
            expect(resolveApiActorMock).not.toHaveBeenCalled();
            expect(transferOwnershipMock).not.toHaveBeenCalled();
        }
    );
});
