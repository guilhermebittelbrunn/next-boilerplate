import { createHash } from "node:crypto";
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
    findByTokenHashMock,
    acceptMock,
    findOrganizationMock,
    findMembershipMock,
    findProfileByIdMock,
    recordAuditEventMock,
} = vi.hoisted(() => ({
    envMock: {
        NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED: "true" as string | undefined,
    },
    resolveApiActorMock: vi.fn(),
    findByReferenceIdMock: vi.fn(),
    findByTokenHashMock: vi.fn(),
    acceptMock: vi.fn(),
    findOrganizationMock: vi.fn(),
    findMembershipMock: vi.fn(),
    findProfileByIdMock: vi.fn(),
    recordAuditEventMock: vi.fn(),
}));

vi.mock("@/env", () => ({ env: envMock }));

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

vi.mock("@repo/auth/server", () => ({ getAuthInstance: vi.fn() }));
vi.mock("@repo/email", () => ({ sendEmail: vi.fn() }));
vi.mock("@repo/email/templates/action-link", () => ({
    actionLinkEmail: { id: "action-link" },
}));

vi.mock("@/(shared)/repositories/organization.repository", () => ({
    organizationRepository: {
        findById: (...args: unknown[]) => findOrganizationMock(...args),
    },
}));

vi.mock("@/(shared)/repositories/organization-member.repository", () => ({
    organizationMemberRepository: {
        findByUserId: (...args: unknown[]) => findMembershipMock(...args),
        findInOrganization: vi.fn(),
    },
}));

vi.mock("@/(shared)/repositories/organization-invitation.repository", () => ({
    organizationInvitationRepository: {
        findByTokenHash: (...args: unknown[]) => findByTokenHashMock(...args),
        acceptByTokenHash: (...args: unknown[]) => acceptMock(...args),
    },
}));

const { POST: PREVIEW } = await import(
    "@/app/(routes)/invitations/preview/route"
);
const { POST: ACCEPT } = await import(
    "@/app/(routes)/invitations/accept/route"
);

/** 32 random bytes in base64url are 43 characters. */
const TOKEN_LENGTH = 43;
const TOKEN = "T".repeat(TOKEN_LENGTH);
const TOKEN_HASH = createHash("sha256").update(TOKEN).digest("hex");
const INVITEE = "qa-teams-organizations@example.com";
const INVITEE_UID = "invitee-uid";
const INVITEE_PROFILE = {
    id: "invitee-profile",
    reference_id: INVITEE_UID,
    type: UserType.COMMON,
};
const ADMIN_UID = "admin-uid";
const ORGANIZATION_ID = "org-1";

function invitation(overrides: Record<string, unknown> = {}) {
    return {
        id: "inv-1",
        organizationId: ORGANIZATION_ID,
        email: INVITEE,
        role: "member",
        tokenHash: TOKEN_HASH,
        invitedByUserId: "owner-profile",
        inviterEmail: "owner@example.com",
        expiresAt: "2099-01-01T00:00:00.000Z",
        lastSentAt: "2026-10-22T12:00:00.000Z",
        acceptedAt: null,
        acceptedByUserId: null,
        createdAt: "2026-10-22T12:00:00.000Z",
        updatedAt: "2026-10-22T12:00:00.000Z",
        deletedAt: null,
        ...overrides,
    };
}

function publicRequest(body: unknown): Request {
    return new Request("http://localhost:3002/invitations/preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
}

function signedInRequest(body: unknown, actorUid = INVITEE_UID): NextRequest {
    const isAdmin = actorUid === ADMIN_UID;
    return {
        method: "POST",
        url: "http://localhost:3002/invitations/accept",
        headers: new Headers({
            [AUTH_REQUEST_HEADER.USER_ID]: actorUid,
            [AUTH_REQUEST_HEADER.USER_ROLE]: isAdmin
                ? UserRoleLevel.ADMIN
                : UserRoleLevel.COMMON,
            [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
            [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: INVITEE_UID,
        }),
        json: () => Promise.resolve(body),
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
        findByTokenHashMock,
        acceptMock,
        findOrganizationMock,
        findMembershipMock,
        findProfileByIdMock,
        recordAuditEventMock,
    ]) {
        mock.mockReset();
    }
    envMock.NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED = "true";
    resolveApiActorMock.mockResolvedValue({
        uid: INVITEE_UID,
        email: "QA-Teams-Organizations@Example.com",
    });
    findByReferenceIdMock.mockImplementation((uid: string) =>
        Promise.resolve(
            uid === ADMIN_UID
                ? { id: "admin", reference_id: ADMIN_UID, type: UserType.ADMIN }
                : INVITEE_PROFILE
        )
    );
    findByTokenHashMock.mockResolvedValue(invitation());
    findOrganizationMock.mockResolvedValue({
        id: ORGANIZATION_ID,
        ownerUserId: "owner-profile",
    });
    findMembershipMock.mockResolvedValue({ organizationId: ORGANIZATION_ID });
    findProfileByIdMock.mockImplementation((id: string) =>
        Promise.resolve({
            id,
            reference_id: `${id}-uid`,
            type: UserType.COMMON,
        })
    );
    acceptMock.mockResolvedValue({
        status: "accepted",
        organizationId: ORGANIZATION_ID,
    });
});

describe("POST /invitations/preview", () => {
    it("shows who invited and which address, looking the token up by its hash", async () => {
        const response = await PREVIEW(publicRequest({ token: TOKEN }));

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(await response.json()).toEqual({
            data: {
                email: INVITEE,
                inviterEmail: "owner@example.com",
                expiresAt: "2099-01-01T00:00:00.000Z",
            },
        });
        expect(findByTokenHashMock).toHaveBeenCalledWith(TOKEN_HASH);
    });

    it.each([
        ["unknown or revoked", null],
        ["accepted", invitation({ acceptedAt: "2026-10-22T13:00:00.000Z" })],
    ])("answers INVALID to a token that is %s", async (_label, stored) => {
        findByTokenHashMock.mockResolvedValue(stored);

        const response = await PREVIEW(publicRequest({ token: TOKEN }));

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await codeOf(response)).toBe("ORGANIZATION_INVITATION_INVALID");
    });

    it("answers EXPIRED to a token past its validity", async () => {
        findByTokenHashMock.mockResolvedValue(
            invitation({ expiresAt: "2020-01-01T00:00:00.000Z" })
        );

        const response = await PREVIEW(publicRequest({ token: TOKEN }));

        expect(await codeOf(response)).toBe("ORGANIZATION_INVITATION_EXPIRED");
    });

    it("answers INVALID when the organization's owner moved elsewhere", async () => {
        findMembershipMock.mockResolvedValue({ organizationId: "org-other" });

        const response = await PREVIEW(publicRequest({ token: TOKEN }));

        expect(await codeOf(response)).toBe("ORGANIZATION_INVITATION_INVALID");
    });

    it("answers INVALID when the organization's owner was archived", async () => {
        findProfileByIdMock.mockResolvedValue(null);

        const response = await PREVIEW(publicRequest({ token: TOKEN }));

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await codeOf(response)).toBe("ORGANIZATION_INVITATION_INVALID");
        expect(findProfileByIdMock).toHaveBeenCalledWith("owner-profile");
    });

    it.each([{}, { token: "short" }, { token: `${TOKEN}=` }])(
        "refuses %j with VALIDATION_FAILED",
        async (body) => {
            const response = await PREVIEW(publicRequest(body));

            expect(await codeOf(response)).toBe("VALIDATION_FAILED");
            expect(findByTokenHashMock).not.toHaveBeenCalled();
        }
    );

    it("answers 404 with members switched off, without looking anything up", async () => {
        envMock.NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED = undefined;

        const response = await PREVIEW(publicRequest({ token: TOKEN }));

        expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
        expect(await codeOf(response)).toBe("ORGANIZATION_MEMBERS_DISABLED");
        expect(findByTokenHashMock).not.toHaveBeenCalled();
    });
});

describe("POST /invitations/accept", () => {
    it("accepts for the signed-in account, comparing its normalized address", async () => {
        const response = await ACCEPT(signedInRequest({ token: TOKEN }));

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(await response.json()).toEqual({
            data: { organizationId: ORGANIZATION_ID },
        });
        expect(acceptMock).toHaveBeenCalledWith(
            expect.objectContaining({
                tokenHash: TOKEN_HASH,
                userId: INVITEE_PROFILE.id,
                email: INVITEE,
            })
        );
        expect(recordAuditEventMock).toHaveBeenCalledTimes(1);
        expect(recordAuditEventMock).toHaveBeenCalledWith({
            action: "organization.invitation.accept",
            actorUserId: INVITEE_PROFILE.id,
            actorUid: INVITEE_UID,
            actorLabel: "QA-Teams-Organizations@Example.com",
            targetType: "organization",
            targetUserId: null,
            targetLabel: null,
            requestId: null,
        });
    });

    it("answers success again to the same person clicking twice", async () => {
        acceptMock.mockResolvedValue({
            status: "already-accepted",
            organizationId: ORGANIZATION_ID,
        });

        const response = await ACCEPT(signedInRequest({ token: TOKEN }));

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(recordAuditEventMock).not.toHaveBeenCalled();
    });

    it.each([
        ["invalid", HTTP_STATUS.BAD_REQUEST, "ORGANIZATION_INVITATION_INVALID"],
        ["expired", HTTP_STATUS.BAD_REQUEST, "ORGANIZATION_INVITATION_EXPIRED"],
        [
            "email-mismatch",
            HTTP_STATUS.FORBIDDEN,
            "ORGANIZATION_INVITATION_EMAIL_MISMATCH",
        ],
        [
            "already-member",
            HTTP_STATUS.CONFLICT,
            "ORGANIZATION_INVITATION_ALREADY_MEMBER",
        ],
        [
            "owner-has-members",
            HTTP_STATUS.CONFLICT,
            "ORGANIZATION_INVITATION_OWNER_HAS_MEMBERS",
        ],
    ] as const)("maps %s to %i %s", async (status, httpStatus, code) => {
        acceptMock.mockResolvedValue({ status });

        const response = await ACCEPT(signedInRequest({ token: TOKEN }));

        expect(response.status).toBe(httpStatus);
        expect(await codeOf(response)).toBe(code);
        expect(recordAuditEventMock).not.toHaveBeenCalled();
    });

    it("refuses an admin acting as the invitee: accepting is a write", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: ADMIN_UID });

        const response = await ACCEPT(
            signedInRequest({ token: TOKEN }, ADMIN_UID)
        );

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await codeOf(response)).toBe(
            "AUTH_REQUEST_IMPERSONATION_READ_ONLY"
        );
        expect(acceptMock).not.toHaveBeenCalled();
    });

    it("refuses without a session", async () => {
        resolveApiActorMock.mockResolvedValue(null);

        const response = await ACCEPT(signedInRequest({ token: TOKEN }));

        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
        expect(acceptMock).not.toHaveBeenCalled();
    });

    it("answers 404 with members switched off, before authenticating", async () => {
        envMock.NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED = "false";

        const response = await ACCEPT(signedInRequest({ token: TOKEN }));

        expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
        expect(await codeOf(response)).toBe("ORGANIZATION_MEMBERS_DISABLED");
        expect(resolveApiActorMock).not.toHaveBeenCalled();
    });
});
