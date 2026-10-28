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
    resolveMembershipMock,
    canSendMock,
    sendEmailMock,
    getUserByEmailMock,
    findInOrganizationMock,
    issueMock,
    listPendingMock,
    findPendingMock,
    revokeMock,
    logEventMock,
    recordAuditEventMock,
} = vi.hoisted(() => ({
    envMock: {
        NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED: "true" as string | undefined,
        NEXT_PUBLIC_APP_URL: "https://app.example.com" as string | undefined,
    },
    resolveApiActorMock: vi.fn(),
    findByReferenceIdMock: vi.fn(),
    resolveMembershipMock: vi.fn(),
    canSendMock: vi.fn(),
    sendEmailMock: vi.fn(),
    getUserByEmailMock: vi.fn(),
    findInOrganizationMock: vi.fn(),
    issueMock: vi.fn(),
    listPendingMock: vi.fn(),
    findPendingMock: vi.fn(),
    revokeMock: vi.fn(),
    logEventMock: vi.fn(),
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

vi.mock("@/(shared)/lib/auth-action-links", () => ({
    canSendAuthActionLink: () => canSendMock(),
}));

vi.mock("@repo/email", () => ({
    sendEmail: (...args: unknown[]) => sendEmailMock(...args),
}));

vi.mock("@repo/email/templates/action-link", () => ({
    actionLinkEmail: { id: "action-link" },
}));

vi.mock("@repo/auth/server", () => ({
    getAuthInstance: () => ({
        getUserByEmail: (...args: unknown[]) => getUserByEmailMock(...args),
    }),
}));

vi.mock("@/(shared)/repositories/organization.repository", () => ({
    organizationRepository: { findById: vi.fn() },
}));

vi.mock("@/(shared)/repositories/organization-member.repository", () => ({
    organizationMemberRepository: {
        findInOrganization: (...args: unknown[]) =>
            findInOrganizationMock(...args),
        findByUserId: vi.fn(),
    },
}));

vi.mock("@/(shared)/repositories/organization-invitation.repository", () => ({
    organizationInvitationRepository: {
        issue: (...args: unknown[]) => issueMock(...args),
        listPendingByOrganization: (...args: unknown[]) =>
            listPendingMock(...args),
        findPendingInOrganization: (...args: unknown[]) =>
            findPendingMock(...args),
        revoke: (...args: unknown[]) => revokeMock(...args),
    },
}));

vi.mock("@repo/shared/utils/helpers/log", () => ({
    logEvent: (...args: unknown[]) => logEventMock(...args),
}));

const { GET, POST } = await import(
    "@/app/(routes)/organization/invitations/route"
);
const { DELETE } = await import(
    "@/app/(routes)/organization/invitations/[id]/route"
);

const OWNER_UID = "owner-uid";
const OWNER_EMAIL = "owner@example.com";
const OWNER_PROFILE = {
    id: "owner-profile",
    reference_id: OWNER_UID,
    type: UserType.COMMON,
};
const ADMIN_UID = "admin-uid";
const ORGANIZATION_ID = "org-1";
const INVITEE = "qa-teams-organizations@example.com";
const REQUEST_ID = "req-invite";
const STATUS_CREATED = 201;
const STATUS_NO_CONTENT = 204;
const NOW_ISO = "2026-10-22T12:00:00.000Z";
const BASE64URL_TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

const OWNER = { organizationId: ORGANIZATION_ID, role: "owner" };
const MEMBER = { organizationId: ORGANIZATION_ID, role: "member" };

function storedInvitation(overrides: Record<string, unknown> = {}) {
    return {
        id: "inv-1",
        organizationId: ORGANIZATION_ID,
        email: INVITEE,
        role: "member",
        tokenHash: "stored-hash",
        invitedByUserId: OWNER_PROFILE.id,
        inviterEmail: OWNER_EMAIL,
        expiresAt: "2099-01-01T00:00:00.000Z",
        lastSentAt: NOW_ISO,
        acceptedAt: null,
        acceptedByUserId: null,
        createdAt: NOW_ISO,
        updatedAt: NOW_ISO,
        deletedAt: null,
        ...overrides,
    };
}

function request(
    method: string,
    body?: unknown,
    actorUid = OWNER_UID
): NextRequest {
    const isAdmin = actorUid === ADMIN_UID;
    return {
        method,
        url: "http://localhost:3002/organization/invitations",
        headers: new Headers({
            [AUTH_REQUEST_HEADER.USER_ID]: actorUid,
            [AUTH_REQUEST_HEADER.USER_ROLE]: isAdmin
                ? UserRoleLevel.ADMIN
                : UserRoleLevel.COMMON,
            [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
            [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: OWNER_UID,
            "x-request-id": REQUEST_ID,
        }),
        json: () => Promise.resolve(body ?? {}),
    } as unknown as NextRequest;
}

const idContext = { params: { id: "inv-1" } };

async function codeOf(response: Response): Promise<string> {
    const body = (await response.json()) as { error: { code: string } };
    return body.error.code;
}

const sha256 = (value: string) =>
    createHash("sha256").update(value).digest("hex");

beforeEach(() => {
    for (const mock of [
        resolveApiActorMock,
        findByReferenceIdMock,
        resolveMembershipMock,
        canSendMock,
        sendEmailMock,
        getUserByEmailMock,
        findInOrganizationMock,
        issueMock,
        listPendingMock,
        findPendingMock,
        revokeMock,
        logEventMock,
        recordAuditEventMock,
    ]) {
        mock.mockReset();
    }
    envMock.NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED = "true";
    envMock.NEXT_PUBLIC_APP_URL = "https://app.example.com";
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
    resolveMembershipMock.mockResolvedValue(OWNER);
    canSendMock.mockReturnValue(true);
    sendEmailMock.mockResolvedValue({ sent: true, id: "email-1" });
    getUserByEmailMock.mockRejectedValue(
        Object.assign(new Error("no user"), { code: "auth/user-not-found" })
    );
    issueMock.mockImplementation((input: { id: string; tokenHash: string }) =>
        Promise.resolve({
            status: "issued",
            invitation: storedInvitation({
                id: input.id,
                tokenHash: input.tokenHash,
            }),
        })
    );
    listPendingMock.mockResolvedValue([]);
    revokeMock.mockResolvedValue(undefined);
});

describe("POST /organization/invitations", () => {
    it("stores only the hash of the token it emails, and never answers with the token", async () => {
        const response = await POST(
            request("POST", {
                email: ` ${INVITEE.toUpperCase()} `,
                locale: "en",
            })
        );

        expect(response.status).toBe(STATUS_CREATED);
        const sentUrl = sendEmailMock.mock.calls[0]?.[0].data.url as string;
        expect(
            sentUrl.startsWith("https://app.example.com/en/invite?token=")
        ).toBe(true);
        const token = new URL(sentUrl).searchParams.get("token") as string;
        expect(token).toMatch(BASE64URL_TOKEN_RE);

        const issued = issueMock.mock.calls[0]?.[0];
        expect(issued.tokenHash).toBe(sha256(token));
        expect(issued.email).toBe(INVITEE);
        expect(issued.id).toBe(sha256(`${ORGANIZATION_ID}:${INVITEE}`));
        expect(JSON.stringify(issued)).not.toContain(token);

        const body = await response.text();
        expect(body).not.toContain(token);
        expect(body).not.toContain(issued.tokenHash);
        expect(JSON.parse(body).data).toMatchObject({
            delivery: "sent",
            invitation: { email: INVITEE, status: "pending" },
        });
    });

    it("records the invitation in the trail without the invitee's address", async () => {
        const response = await POST(request("POST", { email: INVITEE }));

        expect(response.status).toBe(STATUS_CREATED);
        expect(recordAuditEventMock).toHaveBeenCalledTimes(1);
        expect(recordAuditEventMock).toHaveBeenCalledWith({
            action: "organization.invitation.send",
            actorUserId: OWNER_PROFILE.id,
            actorUid: OWNER_UID,
            actorLabel: OWNER_EMAIL,
            targetType: "organization",
            targetUserId: null,
            targetLabel: null,
            requestId: REQUEST_ID,
        });
        expect(JSON.stringify(recordAuditEventMock.mock.calls)).not.toContain(
            INVITEE
        );
    });

    it("names the inviter by email in the message, in the requested language", async () => {
        await POST(request("POST", { email: INVITEE, locale: "es" }));

        expect(sendEmailMock).toHaveBeenCalledWith(
            expect.objectContaining({
                to: INVITEE,
                locale: "es",
                data: expect.objectContaining({
                    name: OWNER_EMAIL,
                    action: "organizationInvitation",
                }),
            })
        );
    });

    it("refuses without email configured, before reading the body", async () => {
        canSendMock.mockReturnValue(false);
        const json = vi.fn();

        const response = await POST({
            ...request("POST"),
            json,
        } as unknown as NextRequest);

        expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
        expect(await codeOf(response)).toBe("EMAIL_NOT_CONFIGURED");
        expect(json).not.toHaveBeenCalled();
        expect(issueMock).not.toHaveBeenCalled();
        expect(recordAuditEventMock).not.toHaveBeenCalled();
    });

    it("keeps the invitation and says so when the provider refuses the email", async () => {
        sendEmailMock.mockResolvedValue({
            sent: false,
            reason: "provider-error",
        });

        const response = await POST(request("POST", { email: INVITEE }));

        expect(response.status).toBe(STATUS_CREATED);
        const body = (await response.json()) as { data: { delivery: string } };
        expect(body.data.delivery).toBe("failed");
        expect(recordAuditEventMock).toHaveBeenCalledTimes(1);
        expect(logEventMock).toHaveBeenCalledWith(
            "organization",
            "invitation-delivery-failed",
            expect.any(Object)
        );
        expect(JSON.stringify(logEventMock.mock.calls)).not.toContain(INVITEE);
    });

    it("refuses an address that already belongs to the organization", async () => {
        getUserByEmailMock.mockResolvedValue({ uid: "member-uid" });
        findInOrganizationMock.mockResolvedValue({ userId: "member-profile" });

        const response = await POST(request("POST", { email: INVITEE }));

        expect(response.status).toBe(HTTP_STATUS.CONFLICT);
        expect(await codeOf(response)).toBe(
            "ORGANIZATION_INVITATION_ALREADY_MEMBER"
        );
        expect(issueMock).not.toHaveBeenCalled();
    });

    it("answers 503 and stores and sends nothing when Auth fails for a reason other than a missing account", async () => {
        getUserByEmailMock.mockRejectedValue(
            Object.assign(new Error(`unavailable for ${INVITEE}`), {
                code: "auth/internal-error",
            })
        );

        const response = await POST(request("POST", { email: INVITEE }));

        expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
        expect(await codeOf(response)).toBe("ORGANIZATION_INVITATION_FAILED");
        expect(issueMock).not.toHaveBeenCalled();
        expect(sendEmailMock).not.toHaveBeenCalled();
        expect(logEventMock).toHaveBeenCalledWith(
            "organization",
            "invitation-member-check-failed",
            { requestId: REQUEST_ID, reason: "auth/internal-error" }
        );
        const logged = JSON.stringify(logEventMock.mock.calls);
        expect(logged).not.toContain(INVITEE);
        expect(logged).not.toContain(OWNER_EMAIL);
        expect(logged).not.toContain("unavailable");
    });

    it("answers 503 and stores nothing when the membership read fails", async () => {
        getUserByEmailMock.mockResolvedValue({ uid: "member-uid" });
        findInOrganizationMock.mockRejectedValue(
            Object.assign(new Error("firestore down"), {
                name: "FirebaseError",
            })
        );

        const response = await POST(request("POST", { email: INVITEE }));

        expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
        expect(await codeOf(response)).toBe("ORGANIZATION_INVITATION_FAILED");
        expect(issueMock).not.toHaveBeenCalled();
        expect(sendEmailMock).not.toHaveBeenCalled();
        expect(logEventMock).toHaveBeenCalledWith(
            "organization",
            "invitation-member-check-failed",
            { requestId: REQUEST_ID, reason: "FirebaseError" }
        );
    });

    it("answers 429 to a resend inside the interval", async () => {
        issueMock.mockResolvedValue({ status: "recently-sent" });

        const response = await POST(request("POST", { email: INVITEE }));

        expect(response.status).toBe(HTTP_STATUS.TOO_MANY_REQUESTS);
        expect(await codeOf(response)).toBe(
            "ORGANIZATION_INVITATION_RECENTLY_SENT"
        );
        expect(sendEmailMock).not.toHaveBeenCalled();
        expect(recordAuditEventMock).not.toHaveBeenCalled();
    });

    it("answers 409 at the pending ceiling", async () => {
        issueMock.mockResolvedValue({ status: "limit-reached" });

        const response = await POST(request("POST", { email: INVITEE }));

        expect(response.status).toBe(HTTP_STATUS.CONFLICT);
        expect(await codeOf(response)).toBe(
            "ORGANIZATION_INVITATION_LIMIT_REACHED"
        );
        expect(recordAuditEventMock).not.toHaveBeenCalled();
    });

    it.each([
        { email: "" },
        { email: "   " },
        { email: "not-an-address" },
        { email: INVITEE, locale: "fr" },
        { email: INVITEE, role: "owner" },
    ])("refuses %j with VALIDATION_FAILED", async (body) => {
        const response = await POST(request("POST", body));

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await codeOf(response)).toBe("VALIDATION_FAILED");
        expect(issueMock).not.toHaveBeenCalled();
    });

    it("refuses a member with 403", async () => {
        resolveMembershipMock.mockResolvedValue(MEMBER);

        const response = await POST(request("POST", { email: INVITEE }));

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await codeOf(response)).toBe("ORGANIZATION_FORBIDDEN");
        expect(issueMock).not.toHaveBeenCalled();
    });

    it("refuses an impersonating admin as read-only", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: ADMIN_UID });

        const response = await POST(
            request("POST", { email: INVITEE }, ADMIN_UID)
        );

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await codeOf(response)).toBe(
            "AUTH_REQUEST_IMPERSONATION_READ_ONLY"
        );
    });
});

describe("GET /organization/invitations", () => {
    it("lists pending invitations to the owner without any secret", async () => {
        listPendingMock.mockResolvedValue([
            storedInvitation(),
            storedInvitation({
                id: "inv-2",
                expiresAt: "2020-01-01T00:00:00.000Z",
            }),
        ]);

        const response = await GET(request("GET"));
        const text = await response.text();

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(text).not.toContain("stored-hash");
        expect(text).not.toContain(OWNER_PROFILE.id);
        const { data } = JSON.parse(text) as {
            data: { id: string; status: string }[];
        };
        expect(
            Object.fromEntries(data.map((item) => [item.id, item.status]))
        ).toEqual({ "inv-1": "pending", "inv-2": "expired" });
    });

    it("refuses a member", async () => {
        resolveMembershipMock.mockResolvedValue(MEMBER);

        const response = await GET(request("GET"));

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(listPendingMock).not.toHaveBeenCalled();
    });
});

describe("DELETE /organization/invitations/:id", () => {
    it("revokes an invitation of the organization", async () => {
        findPendingMock.mockResolvedValue(storedInvitation());

        const response = await DELETE(request("DELETE"), idContext);

        expect(response.status).toBe(STATUS_NO_CONTENT);
        expect(findPendingMock).toHaveBeenCalledWith("inv-1", ORGANIZATION_ID);
        expect(revokeMock).toHaveBeenCalledWith("inv-1");
    });

    it("answers 404 to an invitation of another organization or already accepted", async () => {
        findPendingMock.mockResolvedValue(null);

        const response = await DELETE(request("DELETE"), idContext);

        expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
        expect(await codeOf(response)).toBe(
            "ORGANIZATION_INVITATION_NOT_FOUND"
        );
        expect(revokeMock).not.toHaveBeenCalled();
    });
});

describe("with members switched off", () => {
    beforeEach(() => {
        envMock.NEXT_PUBLIC_ORGANIZATION_MEMBERS_ENABLED = "";
    });

    it.each([
        ["GET", () => GET(request("GET"))],
        ["POST", () => POST(request("POST", { email: INVITEE }))],
        ["DELETE", () => DELETE(request("DELETE"), idContext)],
    ] as const)(
        "answers %s with 404 before authenticating",
        async (_m, call) => {
            const response = await call();

            expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
            expect(await codeOf(response)).toBe(
                "ORGANIZATION_MEMBERS_DISABLED"
            );
            expect(resolveApiActorMock).not.toHaveBeenCalled();
            expect(resolveMembershipMock).not.toHaveBeenCalled();
        }
    );
});
