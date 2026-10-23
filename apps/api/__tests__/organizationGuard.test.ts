import { UserRoleLevel } from "@repo/auth/types";
import { UserType } from "@repo/sdk/src/types";
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    resolveApiActorMock,
    findByReferenceIdMock,
    isBillingEnabledMock,
    resolveMembershipMock,
    handlerMock,
} = vi.hoisted(() => ({
    resolveApiActorMock: vi.fn(),
    findByReferenceIdMock: vi.fn(),
    isBillingEnabledMock: vi.fn(),
    resolveMembershipMock: vi.fn(),
    handlerMock: vi.fn(),
}));

vi.mock("@/(shared)/lib/billing", () => ({
    isBillingEnabled: () => isBillingEnabledMock(),
}));

vi.mock("@/(shared)/lib/audit-recorder", () => ({
    recordAuditEvent: vi.fn(),
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

const { requireOrganizationApi } = await import("@/app/(guards)/organization");

const ADMIN_UID = "admin-1";
const SUBJECT_UID = "common-9";
const FEATURE = "advanced-reports";
const ADMIN_PROFILE = {
    id: "admin-profile",
    reference_id: ADMIN_UID,
    type: UserType.ADMIN,
};
const SUBJECT_PROFILE = {
    id: "subject-profile",
    reference_id: SUBJECT_UID,
    type: UserType.COMMON,
};
const MEMBERSHIP = {
    id: SUBJECT_PROFILE.id,
    userId: SUBJECT_PROFILE.id,
    organizationId: "org-1",
    role: "member" as const,
    joinedAt: "2026-10-01T00:00:00.000Z",
    legacyClaimPending: false,
};

function request(method: string, actorUid = SUBJECT_UID): NextRequest {
    const isAdmin = actorUid === ADMIN_UID;
    return {
        method,
        url: "http://localhost:3002/anything",
        headers: new Headers({
            [AUTH_REQUEST_HEADER.USER_ID]: actorUid,
            [AUTH_REQUEST_HEADER.USER_ROLE]: isAdmin
                ? UserRoleLevel.ADMIN
                : UserRoleLevel.COMMON,
            [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
            [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: SUBJECT_UID,
        }),
        json: () => Promise.resolve({}),
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
        isBillingEnabledMock,
        resolveMembershipMock,
        handlerMock,
    ]) {
        mock.mockReset();
    }
    resolveApiActorMock.mockResolvedValue({ uid: SUBJECT_UID });
    findByReferenceIdMock.mockImplementation((uid: string) =>
        Promise.resolve(uid === ADMIN_UID ? ADMIN_PROFILE : SUBJECT_PROFILE)
    );
    isBillingEnabledMock.mockReturnValue(true);
    resolveMembershipMock.mockResolvedValue(MEMBERSHIP);
    handlerMock.mockResolvedValue(Response.json({ ok: true }));
});

describe("requireOrganizationApi", () => {
    it("hands the handler the organization and the role inside it", async () => {
        const route = requireOrganizationApi(handlerMock);

        await route(request("GET"));

        expect(handlerMock).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                subjectProfile: SUBJECT_PROFILE,
                organization: { organizationId: "org-1", role: "member" },
            })
        );
    });

    it("resolves the impersonated person's organization, never the admin's", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: ADMIN_UID });
        const route = requireOrganizationApi(handlerMock);

        const response = await route(request("GET", ADMIN_UID));

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(resolveMembershipMock).toHaveBeenCalledTimes(1);
        expect(resolveMembershipMock).toHaveBeenCalledWith(SUBJECT_PROFILE.id);
    });

    it("refuses an impersonated write before resolving anything", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: ADMIN_UID });
        const route = requireOrganizationApi(handlerMock);

        const response = await route(request("POST", ADMIN_UID));

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await codeOf(response)).toBe(
            "AUTH_REQUEST_IMPERSONATION_READ_ONLY"
        );
        expect(resolveMembershipMock).not.toHaveBeenCalled();
        expect(handlerMock).not.toHaveBeenCalled();
    });

    it("checks the plan before the organization is resolved", async () => {
        const route = requireOrganizationApi(handlerMock, {
            plan: { feature: FEATURE },
        });

        const response = await route(request("POST"));

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await codeOf(response)).toBe("PLAN_SUBSCRIPTION_REQUIRED");
        expect(resolveMembershipMock).not.toHaveBeenCalled();
        expect(handlerMock).not.toHaveBeenCalled();
    });

    it("resolves the plan source on every request", async () => {
        let requirement: { feature: string } | null = { feature: FEATURE };
        const route = requireOrganizationApi(handlerMock, {
            plan: () => requirement,
        });

        expect((await route(request("POST"))).status).toBe(
            HTTP_STATUS.FORBIDDEN
        );
        requirement = null;
        expect((await route(request("POST"))).status).toBe(HTTP_STATUS.OK);
    });

    it("lets a platform admin through only by impersonating a common user", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: ADMIN_UID });
        findByReferenceIdMock.mockResolvedValue(ADMIN_PROFILE);
        const route = requireOrganizationApi(handlerMock);

        const response = await route({
            ...request("GET", ADMIN_UID),
            headers: new Headers({
                [AUTH_REQUEST_HEADER.USER_ID]: ADMIN_UID,
                [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.ADMIN,
                [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
                [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: ADMIN_UID,
            }),
        } as unknown as NextRequest);

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(resolveMembershipMock).not.toHaveBeenCalled();
    });

    it("refuses a member on an owner-only route", async () => {
        const route = requireOrganizationApi(handlerMock, { role: "owner" });

        const response = await route(request("GET"));

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await codeOf(response)).toBe("ORGANIZATION_FORBIDDEN");
        expect(handlerMock).not.toHaveBeenCalled();
    });

    it("lets the owner through an owner-only route", async () => {
        resolveMembershipMock.mockResolvedValue({
            ...MEMBERSHIP,
            role: "owner",
        });
        const route = requireOrganizationApi(handlerMock, { role: "owner" });

        const response = await route(request("GET"));

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(handlerMock).toHaveBeenCalledTimes(1);
    });

    it("refuses an unauthenticated caller without resolving anything", async () => {
        resolveApiActorMock.mockResolvedValue(null);
        const route = requireOrganizationApi(handlerMock);

        const response = await route(request("GET"));

        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
        expect(resolveMembershipMock).not.toHaveBeenCalled();
    });
});
