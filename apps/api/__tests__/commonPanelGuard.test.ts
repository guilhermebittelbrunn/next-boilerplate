import { UserRoleLevel } from "@repo/auth/types";
import { UserType } from "@repo/sdk/src/types";
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { resolveApiActorMock, findByReferenceIdMock } = vi.hoisted(() => ({
    resolveApiActorMock: vi.fn(),
    findByReferenceIdMock: vi.fn(),
}));

vi.mock("@/(shared)/lib/resolve-api-actor", () => ({
    resolveApiActor: (...args: unknown[]) => resolveApiActorMock(...args),
}));

vi.mock("@/(shared)/repositories/user.repository", () => ({
    userRepository: {
        findByReferenceId: (...args: unknown[]) =>
            findByReferenceIdMock(...args),
    },
}));

const { requireCommonPanelApi } = await import("@/app/(guards)/common-panel");

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

const MUTATING_METHODS = ["POST", "PUT", "PATCH", "DELETE"];
const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

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

function asImpersonatingAdmin(method: string) {
    return request(method, {
        [AUTH_REQUEST_HEADER.USER_ID]: ADMIN_UID,
        [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.ADMIN,
        [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
        [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: TARGET_UID,
    });
}

async function call(req: NextRequest) {
    const handler = vi.fn().mockResolvedValue(Response.json({ data: "ok" }));
    const response = await requireCommonPanelApi(handler)(req);
    return { handler, response };
}

function givenProfiles() {
    findByReferenceIdMock.mockImplementation((uid: string) => {
        if (uid === ADMIN_UID) {
            return Promise.resolve(ADMIN_PROFILE);
        }
        if (uid === OWNER_UID) {
            return Promise.resolve(OWNER_PROFILE);
        }
        return Promise.resolve(TARGET_PROFILE);
    });
}

beforeEach(() => {
    resolveApiActorMock.mockReset();
    findByReferenceIdMock.mockReset();
    givenProfiles();
});

describe("requireCommonPanelApi", () => {
    /**
     * The regression that matters most: the read-only rule targets impersonation only and
     * must never touch the user operating on their own data.
     */
    it("lets a common user read and write their own data", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: OWNER_UID });

        for (const method of [...SAFE_METHODS, ...MUTATING_METHODS]) {
            const { handler, response } = await call(asOwner(method));

            expect(handler).toHaveBeenCalled();
            expect(response.status).toBe(HTTP_STATUS.OK);
        }
    });

    it("still serves reads while the admin acts as a common user", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: ADMIN_UID });

        for (const method of SAFE_METHODS) {
            const { handler, response } = await call(
                asImpersonatingAdmin(method)
            );

            expect(handler).toHaveBeenCalled();
            expect(response.status).toBe(HTTP_STATUS.OK);
        }
    });

    it("refuses writes while the admin acts as a common user", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: ADMIN_UID });

        for (const method of MUTATING_METHODS) {
            const { handler, response } = await call(
                asImpersonatingAdmin(method)
            );

            expect(handler).not.toHaveBeenCalled();
            expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
            expect(await response.json()).toEqual({
                error: { code: "AUTH_REQUEST_IMPERSONATION_READ_ONLY" },
            });
        }
    });

    /**
     * Dropping the impersonation headers is the obvious way to try to write as oneself
     * through a common route: the subject collapses back to the admin, whose profile is
     * not common.
     */
    it("refuses an admin who drops the impersonation headers", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: ADMIN_UID });

        const { handler, response } = await call(
            request("POST", {
                [AUTH_REQUEST_HEADER.USER_ID]: ADMIN_UID,
                [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.ADMIN,
                [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.ADMIN,
                [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: ADMIN_UID,
            })
        );

        expect(handler).not.toHaveBeenCalled();
        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await response.json()).toEqual({
            error: { code: "COMMON_PANEL_FORBIDDEN" },
        });
    });

    it("refuses a caller without a profile", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: OWNER_UID });
        findByReferenceIdMock.mockResolvedValue(null);

        const { handler, response } = await call(asOwner("GET"));

        expect(handler).not.toHaveBeenCalled();
        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await response.json()).toEqual({
            error: { code: "COMMON_PANEL_FORBIDDEN" },
        });
    });

    it("refuses an unauthenticated caller", async () => {
        resolveApiActorMock.mockResolvedValue(null);

        const { handler, response } = await call(asOwner("GET"));

        expect(handler).not.toHaveBeenCalled();
        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
        expect(await response.json()).toEqual({
            error: { code: "AUTH_INVALID_TOKEN" },
        });
    });
});
