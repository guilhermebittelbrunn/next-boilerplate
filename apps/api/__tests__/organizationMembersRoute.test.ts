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
    findProfileByIdMock,
    resolveMembershipMock,
    listMembersMock,
    findInOrganizationMock,
    removeMock,
    findOrganizationMock,
    getUsersMock,
    getUserMock,
    recordAuditEventMock,
} = vi.hoisted(() => ({
    envMock: {
        NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED: " TRUE " as
            | string
            | undefined,
    },
    resolveApiActorMock: vi.fn(),
    findByReferenceIdMock: vi.fn(),
    findProfileByIdMock: vi.fn(),
    resolveMembershipMock: vi.fn(),
    listMembersMock: vi.fn(),
    findInOrganizationMock: vi.fn(),
    removeMock: vi.fn(),
    findOrganizationMock: vi.fn(),
    getUsersMock: vi.fn(),
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
        findById: (...args: unknown[]) => findProfileByIdMock(...args),
        touchLastAccess: vi.fn(),
    },
}));

vi.mock("@/(shared)/lib/organization-membership", () => ({
    resolveOrganizationMembership: (...args: unknown[]) =>
        resolveMembershipMock(...args),
}));

vi.mock("@repo/auth/server", () => ({
    getAuthInstance: () => ({
        getUsers: (...args: unknown[]) => getUsersMock(...args),
        getUser: (...args: unknown[]) => getUserMock(...args),
    }),
}));

vi.mock("@/(shared)/repositories/organization.repository", () => ({
    organizationRepository: {
        findById: (...args: unknown[]) => findOrganizationMock(...args),
    },
}));

vi.mock("@/(shared)/repositories/organization-member.repository", () => ({
    organizationMemberRepository: {
        listByOrganization: (...args: unknown[]) => listMembersMock(...args),
        findInOrganization: (...args: unknown[]) =>
            findInOrganizationMock(...args),
        remove: (...args: unknown[]) => removeMock(...args),
    },
}));

const { GET: GET_ORGANIZATION } = await import(
    "@/app/(routes)/organization/route"
);
const { GET: LIST_MEMBERS } = await import(
    "@/app/(routes)/organization/members/route"
);
const { DELETE: REMOVE_MEMBER } = await import(
    "@/app/(routes)/organization/members/[id]/route"
);
const { POST: LEAVE } = await import("@/app/(routes)/organization/leave/route");

const ORGANIZATION_ID = "org-1";
const CALLER_UID = "caller-uid";
const CALLER_PROFILE = {
    id: "caller-profile",
    reference_id: CALLER_UID,
    type: UserType.COMMON,
};
const STATUS_NO_CONTENT = 204;

function membership(
    userId: string,
    role: "owner" | "member",
    joinedAt: string
) {
    return {
        id: userId,
        userId,
        organizationId: ORGANIZATION_ID,
        role,
        joinedAt,
        legacyClaimPending: false,
        createdAt: joinedAt,
        updatedAt: joinedAt,
        deletedAt: null,
    };
}

function request(method: string, path = "/organization"): NextRequest {
    return {
        method,
        url: `http://localhost:3002${path}`,
        headers: new Headers({
            [AUTH_REQUEST_HEADER.USER_ID]: CALLER_UID,
            [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.COMMON,
            [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
            [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: CALLER_UID,
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
        findProfileByIdMock,
        resolveMembershipMock,
        listMembersMock,
        findInOrganizationMock,
        removeMock,
        findOrganizationMock,
        getUsersMock,
        getUserMock,
        recordAuditEventMock,
    ]) {
        mock.mockReset();
    }
    envMock.NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED = " TRUE ";
    resolveApiActorMock.mockResolvedValue({ uid: CALLER_UID });
    findByReferenceIdMock.mockResolvedValue(CALLER_PROFILE);
    asRole("member");
    removeMock.mockResolvedValue("removed");
    findProfileByIdMock.mockImplementation((id: string) =>
        Promise.resolve({
            id,
            reference_id: `${id}-uid`,
            type: UserType.COMMON,
        })
    );
    getUserMock.mockImplementation((uid: string) =>
        Promise.resolve({ uid, email: `${uid}@example.com` })
    );
});

describe("GET /organization", () => {
    it("tells the caller their own role", async () => {
        findOrganizationMock.mockResolvedValue({
            id: ORGANIZATION_ID,
            ownerUserId: "owner-profile",
        });

        const response = await GET_ORGANIZATION(request("GET"));

        expect(await response.json()).toEqual({
            data: {
                id: ORGANIZATION_ID,
                ownerUserId: "owner-profile",
                viewerRole: "member",
            },
        });
    });
});

describe("GET /organization/members", () => {
    it("lists everyone to any member, owner first, with names from Auth", async () => {
        listMembersMock.mockResolvedValue([
            membership("member-b", "member", "2026-10-03T00:00:00.000Z"),
            membership("owner-profile", "owner", "2026-10-01T00:00:00.000Z"),
            membership("archived", "member", "2026-10-02T00:00:00.000Z"),
        ]);
        findProfileByIdMock.mockImplementation((id: string) =>
            Promise.resolve(
                id === "archived"
                    ? null
                    : { id, reference_id: `${id}-uid`, type: UserType.COMMON }
            )
        );
        getUsersMock.mockResolvedValue({
            users: [
                {
                    uid: "owner-profile-uid",
                    email: "owner@example.com",
                    displayName: "Owner",
                },
                {
                    uid: "member-b-uid",
                    email: "qa-teams-organizations@example.com",
                },
            ],
        });

        const response = await LIST_MEMBERS(request("GET"));
        const { data } = (await response.json()) as {
            data: { userId: string; email: string | null }[];
        };

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(listMembersMock).toHaveBeenCalledWith(ORGANIZATION_ID);
        expect(data.map((member) => member.userId)).toEqual([
            "owner-profile",
            "archived",
            "member-b",
        ]);
        expect(data[0]).toMatchObject({ archived: false });
        expect(data[1]).toMatchObject({
            email: null,
            displayName: null,
            archived: true,
        });
        expect(data[2]).toMatchObject({
            email: "qa-teams-organizations@example.com",
            displayName: null,
            archived: false,
        });
    });
});

describe("DELETE /organization/members/:id", () => {
    it("lets the owner remove a member, for good", async () => {
        asRole("owner");
        findInOrganizationMock.mockResolvedValue(
            membership("member-b", "member", "2026-10-03T00:00:00.000Z")
        );

        const response = await REMOVE_MEMBER(
            request("DELETE"),
            contextFor("member-b")
        );

        expect(response.status).toBe(STATUS_NO_CONTENT);
        expect(findInOrganizationMock).toHaveBeenCalledWith(
            "member-b",
            ORGANIZATION_ID
        );
        expect(removeMock).toHaveBeenCalledWith("member-b", ORGANIZATION_ID);
        expect(recordAuditEventMock).toHaveBeenCalledTimes(1);
        expect(recordAuditEventMock).toHaveBeenCalledWith({
            action: "organization.member.remove",
            actorUserId: CALLER_PROFILE.id,
            actorUid: CALLER_UID,
            actorLabel: null,
            targetType: "user",
            targetUserId: "member-b",
            targetLabel: "member-b-uid@example.com",
            requestId: null,
        });
    });

    it("records the removal of an archived member without a label", async () => {
        asRole("owner");
        findInOrganizationMock.mockResolvedValue(
            membership("archived", "member", "2026-10-03T00:00:00.000Z")
        );
        findProfileByIdMock.mockResolvedValue(null);

        const response = await REMOVE_MEMBER(
            request("DELETE"),
            contextFor("archived")
        );

        expect(response.status).toBe(STATUS_NO_CONTENT);
        expect(getUserMock).not.toHaveBeenCalled();
        expect(recordAuditEventMock).toHaveBeenCalledWith(
            expect.objectContaining({
                action: "organization.member.remove",
                targetUserId: "archived",
                targetLabel: null,
            })
        );
    });

    it("answers 409 when the member became the owner before the removal ran", async () => {
        asRole("owner");
        findInOrganizationMock.mockResolvedValue(
            membership("member-b", "member", "2026-10-03T00:00:00.000Z")
        );
        removeMock.mockResolvedValue("owner");

        const response = await REMOVE_MEMBER(
            request("DELETE"),
            contextFor("member-b")
        );

        expect(response.status).toBe(HTTP_STATUS.CONFLICT);
        expect(await codeOf(response)).toBe("ORGANIZATION_OWNER_CANNOT_LEAVE");
        expect(recordAuditEventMock).not.toHaveBeenCalled();
    });

    it("refuses a member with 403", async () => {
        const response = await REMOVE_MEMBER(
            request("DELETE"),
            contextFor("member-b")
        );

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await codeOf(response)).toBe("ORGANIZATION_FORBIDDEN");
        expect(removeMock).not.toHaveBeenCalled();
    });

    it("never removes the owner, the owner's own id included", async () => {
        asRole("owner");
        findInOrganizationMock.mockResolvedValue(
            membership("owner-profile", "owner", "2026-10-01T00:00:00.000Z")
        );

        const response = await REMOVE_MEMBER(
            request("DELETE"),
            contextFor("owner-profile")
        );

        expect(response.status).toBe(HTTP_STATUS.CONFLICT);
        expect(await codeOf(response)).toBe("ORGANIZATION_OWNER_CANNOT_LEAVE");
        expect(removeMock).not.toHaveBeenCalled();
    });

    it("answers 404 to someone outside the organization", async () => {
        asRole("owner");
        findInOrganizationMock.mockResolvedValue(null);

        const response = await REMOVE_MEMBER(
            request("DELETE"),
            contextFor("stranger")
        );

        expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
        expect(await codeOf(response)).toBe("ORGANIZATION_MEMBER_NOT_FOUND");
    });

    it("answers 404 when the member moved to another organization before the removal ran", async () => {
        asRole("owner");
        findInOrganizationMock.mockResolvedValue(
            membership("member-b", "member", "2026-10-03T00:00:00.000Z")
        );
        removeMock.mockResolvedValue("not-member");

        const response = await REMOVE_MEMBER(
            request("DELETE"),
            contextFor("member-b")
        );

        expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
        expect(await codeOf(response)).toBe("ORGANIZATION_MEMBER_NOT_FOUND");
        expect(removeMock).toHaveBeenCalledWith("member-b", ORGANIZATION_ID);
        expect(recordAuditEventMock).not.toHaveBeenCalled();
    });
});

describe("POST /organization/leave", () => {
    it("removes the member and resolves their home organization right away", async () => {
        const response = await LEAVE(request("POST", "/organization/leave"));

        expect(response.status).toBe(STATUS_NO_CONTENT);
        expect(removeMock).toHaveBeenCalledWith(
            CALLER_PROFILE.id,
            ORGANIZATION_ID
        );
        expect(resolveMembershipMock).toHaveBeenCalledTimes(2);
        expect(removeMock.mock.invocationCallOrder[0]).toBeLessThan(
            resolveMembershipMock.mock.invocationCallOrder[1] as number
        );
        expect(recordAuditEventMock).toHaveBeenCalledTimes(1);
        expect(recordAuditEventMock).toHaveBeenCalledWith({
            action: "organization.member.leave",
            actorUserId: CALLER_PROFILE.id,
            actorUid: CALLER_UID,
            actorLabel: null,
            targetType: "organization",
            targetUserId: null,
            targetLabel: null,
            requestId: null,
        });
    });

    it("answers 409 when the member became the owner before the exit ran", async () => {
        removeMock.mockResolvedValue("owner");

        const response = await LEAVE(request("POST", "/organization/leave"));

        expect(response.status).toBe(HTTP_STATUS.CONFLICT);
        expect(await codeOf(response)).toBe("ORGANIZATION_OWNER_CANNOT_LEAVE");
        expect(resolveMembershipMock).toHaveBeenCalledTimes(1);
        expect(recordAuditEventMock).not.toHaveBeenCalled();
    });

    it("records nothing when the membership had already moved elsewhere", async () => {
        removeMock.mockResolvedValue("not-member");

        const response = await LEAVE(request("POST", "/organization/leave"));

        expect(response.status).toBe(STATUS_NO_CONTENT);
        expect(resolveMembershipMock).toHaveBeenCalledTimes(2);
        expect(recordAuditEventMock).not.toHaveBeenCalled();
    });

    it("refuses the owner", async () => {
        asRole("owner");

        const response = await LEAVE(request("POST", "/organization/leave"));

        expect(response.status).toBe(HTTP_STATUS.CONFLICT);
        expect(await codeOf(response)).toBe("ORGANIZATION_OWNER_CANNOT_LEAVE");
        expect(removeMock).not.toHaveBeenCalled();
    });
});

describe("with members switched off", () => {
    it.each(["", "false", undefined])(
        "answers 404 to every route for %j",
        async (value) => {
            envMock.NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED = value;

            const responses = await Promise.all([
                GET_ORGANIZATION(request("GET")),
                LIST_MEMBERS(request("GET")),
                REMOVE_MEMBER(request("DELETE"), contextFor("member-b")),
                LEAVE(request("POST", "/organization/leave")),
            ]);

            for (const response of responses) {
                expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
                expect(await codeOf(response)).toBe(
                    "ORGANIZATION_MEMBERS_DISABLED"
                );
            }
            expect(resolveApiActorMock).not.toHaveBeenCalled();
        }
    );
});
