import { UserRoleLevel } from "@repo/auth/types";
import { type PlanRequirement, UserType } from "@repo/sdk/src/types";
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    resolveApiActorMock,
    findByReferenceIdMock,
    isBillingEnabledMock,
    handlerMock,
} = vi.hoisted(() => ({
    resolveApiActorMock: vi.fn(),
    findByReferenceIdMock: vi.fn(),
    isBillingEnabledMock: vi.fn(),
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

const { requirePlanApi } = await import("@/app/(guards)/plan");

const ADMIN_UID = "admin-1";
const OWNER_UID = "common-9";
const FEATURE = "advanced-reports";
const ADMIN_PROFILE = {
    id: "admin-profile",
    reference_id: ADMIN_UID,
    type: UserType.ADMIN,
};
const UNSUBSCRIBED_PROFILE = {
    id: "profile-1",
    reference_id: OWNER_UID,
    type: UserType.COMMON,
};
const ENTITLED_PROFILE = {
    ...UNSUBSCRIBED_PROFILE,
    subscription: { status: "active" },
    entitlements: { features: [FEATURE] },
};

function request(method: string, actorUid = OWNER_UID): NextRequest {
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
            [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: OWNER_UID,
        }),
        json: () => Promise.resolve({}),
    } as unknown as NextRequest;
}

async function codeOf(response: Response): Promise<string> {
    const body = (await response.json()) as { error: { code: string } };
    return body.error.code;
}

function givenSubject(profile: Record<string, unknown>) {
    findByReferenceIdMock.mockImplementation((uid: string) =>
        Promise.resolve(uid === ADMIN_UID ? ADMIN_PROFILE : profile)
    );
}

beforeEach(() => {
    for (const mock of [
        resolveApiActorMock,
        findByReferenceIdMock,
        isBillingEnabledMock,
        handlerMock,
    ]) {
        mock.mockReset();
    }
    resolveApiActorMock.mockResolvedValue({ uid: OWNER_UID });
    isBillingEnabledMock.mockReturnValue(true);
    handlerMock.mockResolvedValue(Response.json({ ok: true }));
    givenSubject(UNSUBSCRIBED_PROFILE);
});

describe("requirePlanApi", () => {
    it("runs the handler untouched when the requirement is null", async () => {
        const route = requirePlanApi(null, handlerMock);

        const response = await route(request("POST"));

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(handlerMock).toHaveBeenCalledTimes(1);
    });

    it("refuses without a live subscription and never runs the handler", async () => {
        const route = requirePlanApi({}, handlerMock);

        const response = await route(request("POST"));

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await codeOf(response)).toBe("PLAN_SUBSCRIPTION_REQUIRED");
        expect(handlerMock).not.toHaveBeenCalled();
    });

    it("refuses a subscriber without the feature", async () => {
        givenSubject({
            ...UNSUBSCRIBED_PROFILE,
            subscription: { status: "active" },
        });
        const route = requirePlanApi({ feature: FEATURE }, handlerMock);

        const response = await route(request("POST"));

        expect(await codeOf(response)).toBe("PLAN_FEATURE_REQUIRED");
        expect(handlerMock).not.toHaveBeenCalled();
    });

    it("hands the subject profile to the handler when access is granted", async () => {
        givenSubject(ENTITLED_PROFILE);
        const route = requirePlanApi({ feature: FEATURE }, handlerMock);

        await route(request("POST"));

        expect(handlerMock).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                subjectProfile: expect.objectContaining({ id: "profile-1" }),
            })
        );
    });

    it("resolves a requirement function on every request", async () => {
        let current: PlanRequirement | null = null;
        const route = requirePlanApi(() => current, handlerMock);

        expect((await route(request("POST"))).status).toBe(HTTP_STATUS.OK);

        current = {};
        const refused = await route(request("POST"));

        expect(await codeOf(refused)).toBe("PLAN_SUBSCRIPTION_REQUIRED");
        expect(handlerMock).toHaveBeenCalledTimes(1);
    });

    it("lets everyone through while billing is off", async () => {
        isBillingEnabledMock.mockReturnValue(false);
        const route = requirePlanApi({ feature: FEATURE }, handlerMock);

        const response = await route(request("POST"));

        expect(response.status).toBe(HTTP_STATUS.OK);
    });

    it("still refuses a missing credential before looking at the plan", async () => {
        resolveApiActorMock.mockResolvedValue(null);
        const route = requirePlanApi({}, handlerMock);

        const response = await route(request("POST"));

        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
        expect(isBillingEnabledMock).not.toHaveBeenCalled();
    });

    it("refuses an impersonated write as read-only, never with a plan code", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: ADMIN_UID });
        const route = requirePlanApi({ feature: FEATURE }, handlerMock);

        const response = await route(request("POST", ADMIN_UID));

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await codeOf(response)).toBe(
            "AUTH_REQUEST_IMPERSONATION_READ_ONLY"
        );
        expect(isBillingEnabledMock).not.toHaveBeenCalled();
        expect(handlerMock).not.toHaveBeenCalled();
    });

    it("judges an impersonated read by the subject's plan", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: ADMIN_UID });
        const route = requirePlanApi({}, handlerMock);

        const response = await route(request("GET", ADMIN_UID));

        expect(await codeOf(response)).toBe("PLAN_SUBSCRIPTION_REQUIRED");
    });
});
