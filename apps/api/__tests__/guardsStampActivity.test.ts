import { UserRoleLevel } from "@repo/auth/types";
import { UserType } from "@repo/sdk/src/types";
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { resolveApiActorMock, findByReferenceIdMock, touchLastAccessMock } =
    vi.hoisted(() => ({
        resolveApiActorMock: vi.fn(),
        findByReferenceIdMock: vi.fn(),
        touchLastAccessMock: vi.fn(),
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
        touchLastAccess: (...args: unknown[]) => touchLastAccessMock(...args),
    },
}));

const { requireCommonPanelApi } = await import("@/app/(guards)/common-panel");
const { requireAdminApi } = await import("@/app/(guards)/admin");
const { resetActivityDedupeCache } = await import(
    "@/(shared)/lib/activity-recorder"
);

const ADMIN_UID = "admin-1";
const OWNER_UID = "common-7";
const TARGET_UID = "common-9";

const ADMIN_PROFILE = {
    id: "p1",
    reference_id: ADMIN_UID,
    type: UserType.ADMIN,
};
const OWNER_PROFILE = {
    id: "p2",
    reference_id: OWNER_UID,
    type: UserType.COMMON,
};
const TARGET_PROFILE = {
    id: "p3",
    reference_id: TARGET_UID,
    type: UserType.COMMON,
};

function request(method: string, headers: Record<string, string>): NextRequest {
    return {
        method,
        headers: new Headers(headers),
    } as unknown as NextRequest;
}

function asOwner(method: string) {
    return request(method, {
        [AUTH_REQUEST_HEADER.USER_ID]: OWNER_UID,
        [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.COMMON,
        [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
        [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: OWNER_UID,
    });
}

function asAdmin(method: string) {
    return request(method, {
        [AUTH_REQUEST_HEADER.USER_ID]: ADMIN_UID,
        [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.ADMIN,
        [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.ADMIN,
        [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: ADMIN_UID,
    });
}

function asImpersonatingAdmin(method: string) {
    return request(method, {
        [AUTH_REQUEST_HEADER.USER_ID]: ADMIN_UID,
        [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.ADMIN,
        [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
        [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: TARGET_UID,
    });
}

function ok() {
    return vi.fn().mockResolvedValue(Response.json({ data: "ok" }));
}

function stampedProfileIds() {
    return touchLastAccessMock.mock.calls.map(([id]) => id);
}

beforeEach(() => {
    resolveApiActorMock.mockReset();
    touchLastAccessMock.mockReset();
    touchLastAccessMock.mockResolvedValue(undefined);
    findByReferenceIdMock.mockReset();
    findByReferenceIdMock.mockImplementation((uid: string) => {
        if (uid === ADMIN_UID) {
            return Promise.resolve(ADMIN_PROFILE);
        }
        if (uid === OWNER_UID) {
            return Promise.resolve(OWNER_PROFILE);
        }
        return Promise.resolve(TARGET_PROFILE);
    });
    resetActivityDedupeCache();
    vi.spyOn(console, "warn").mockImplementation(() => {
        // Keeps the refused-write case from printing its failure line into the run.
    });
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("requireCommonPanelApi stamps activity", () => {
    it("stamps the common user acting on their own data", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: OWNER_UID });

        await requireCommonPanelApi(ok())(asOwner("GET"));

        expect(stampedProfileIds()).toEqual([OWNER_PROFILE.id]);
    });

    /**
     * The rule that keeps the column honest: an admin investigating dormant accounts would
     * mark every one of them as active if the subject were stamped instead of the actor.
     */
    it("stamps the admin and leaves the impersonated profile untouched", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: ADMIN_UID });

        await requireCommonPanelApi(ok())(asImpersonatingAdmin("GET"));

        expect(stampedProfileIds()).toEqual([ADMIN_PROFILE.id]);
        expect(stampedProfileIds()).not.toContain(TARGET_PROFILE.id);
    });

    it("stamps a common user editing their own data", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: OWNER_UID });

        const response = await requireCommonPanelApi(ok())(asOwner("PUT"));

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(stampedProfileIds()).toEqual([OWNER_PROFILE.id]);
    });

    it("does not stamp a write refused while impersonating", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: ADMIN_UID });

        const response = await requireCommonPanelApi(ok())(
            asImpersonatingAdmin("POST")
        );

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await response.json()).toEqual({
            error: { code: "AUTH_REQUEST_IMPERSONATION_READ_ONLY" },
        });
        expect(touchLastAccessMock).not.toHaveBeenCalled();
    });

    it("does not stamp an unauthenticated caller", async () => {
        resolveApiActorMock.mockResolvedValue(null);

        const response = await requireCommonPanelApi(ok())(asOwner("GET"));

        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
        expect(touchLastAccessMock).not.toHaveBeenCalled();
    });

    it("does not stamp a caller without a profile", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: OWNER_UID });
        findByReferenceIdMock.mockResolvedValue(null);

        const response = await requireCommonPanelApi(ok())(asOwner("GET"));

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(touchLastAccessMock).not.toHaveBeenCalled();
    });

    it("serves the request when the stamp write is refused", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: OWNER_UID });
        touchLastAccessMock.mockRejectedValue(new Error("unavailable"));

        const handler = ok();
        const response = await requireCommonPanelApi(handler)(asOwner("GET"));

        expect(handler).toHaveBeenCalled();
        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(await response.json()).toEqual({ data: "ok" });
    });
});

describe("requireAdminApi stamps activity", () => {
    it("stamps the admin's own profile", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: ADMIN_UID });

        await requireAdminApi(ok())(asAdmin("GET"));

        expect(stampedProfileIds()).toEqual([ADMIN_PROFILE.id]);
    });

    it("stamps an admin on an authorized update", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: ADMIN_UID });

        const response = await requireAdminApi(ok())(asAdmin("PUT"));

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(stampedProfileIds()).toEqual([ADMIN_PROFILE.id]);
    });

    it("stamps an admin on an authorized delete", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: ADMIN_UID });

        const response = await requireAdminApi(ok())(asAdmin("DELETE"));

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(stampedProfileIds()).toEqual([ADMIN_PROFILE.id]);
    });

    it("stamps the admin, not the target, when a mutation acts on another profile", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: ADMIN_UID });

        await requireAdminApi(ok())(asAdmin("DELETE"));

        expect(stampedProfileIds()).not.toContain(TARGET_PROFILE.id);
        expect(stampedProfileIds()).not.toContain(OWNER_PROFILE.id);
    });

    it("does not stamp a non-admin refused by the guard", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: OWNER_UID });

        const response = await requireAdminApi(ok())(asOwner("GET"));

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await response.json()).toEqual({
            error: { code: "ADMIN_FORBIDDEN" },
        });
        expect(touchLastAccessMock).not.toHaveBeenCalled();
    });

    it("does not stamp an unauthenticated caller", async () => {
        resolveApiActorMock.mockResolvedValue(null);

        const response = await requireAdminApi(ok())(asAdmin("GET"));

        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
        expect(touchLastAccessMock).not.toHaveBeenCalled();
    });

    it("writes once for a burst of requests from the same admin", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: ADMIN_UID });
        const REQUESTS = 10;

        for (let i = 0; i < REQUESTS; i += 1) {
            await requireAdminApi(ok())(asAdmin("GET"));
        }

        expect(touchLastAccessMock).toHaveBeenCalledTimes(1);
    });
});
