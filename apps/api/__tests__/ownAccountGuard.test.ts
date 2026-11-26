import { UserRoleLevel } from "@repo/auth/types";
import { UserType } from "@repo/sdk/src/types";
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { resolveApiActorMock, findByReferenceIdMock, recordSessionMock } =
    vi.hoisted(() => ({
        resolveApiActorMock: vi.fn(),
        findByReferenceIdMock: vi.fn(),
        recordSessionMock: vi.fn(),
    }));

vi.mock("@/(shared)/lib/audit-recorder", () => ({
    recordAuditEvent: vi.fn(),
    recordImpersonationSession: (...args: unknown[]) =>
        recordSessionMock(...args),
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

const { requireOwnAccountApi, requireCommonPanelApi } = await import(
    "@/app/(guards)/common-panel"
);

const ADMIN_UID = "admin-1";
const OTHER_ADMIN_UID = "admin-2";
const OWNER_UID = "common-7";
const TARGET_UID = "common-9";

const PROFILES: Record<
    string,
    { id: string; reference_id: string; type: UserType }
> = {
    [ADMIN_UID]: { id: "p1", reference_id: ADMIN_UID, type: UserType.ADMIN },
    [OTHER_ADMIN_UID]: {
        id: "p4",
        reference_id: OTHER_ADMIN_UID,
        type: UserType.ADMIN,
    },
    [OWNER_UID]: { id: "p2", reference_id: OWNER_UID, type: UserType.COMMON },
    [TARGET_UID]: { id: "p3", reference_id: TARGET_UID, type: UserType.COMMON },
};

const MUTATING_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

function request(method: string, headers: Record<string, string>): NextRequest {
    return { method, headers: new Headers(headers) } as unknown as NextRequest;
}

function headersFor(actorUid: string, requestRole: string, targetUid: string) {
    return {
        [AUTH_REQUEST_HEADER.USER_ID]: actorUid,
        [AUTH_REQUEST_HEADER.USER_ROLE]:
            PROFILES[actorUid]?.type === UserType.ADMIN
                ? UserRoleLevel.ADMIN
                : UserRoleLevel.COMMON,
        [AUTH_REQUEST_HEADER.REQUEST_ROLE]: requestRole,
        [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: targetUid,
    };
}

const asOwner = (method: string) =>
    request(method, headersFor(OWNER_UID, UserRoleLevel.COMMON, OWNER_UID));
const asAdminSelf = (method: string) =>
    request(method, headersFor(ADMIN_UID, UserRoleLevel.ADMIN, ADMIN_UID));
const asImpersonatingAdmin = (method: string) =>
    request(method, headersFor(ADMIN_UID, UserRoleLevel.COMMON, TARGET_UID));

async function call(req: NextRequest, guard = requireOwnAccountApi) {
    const handler = vi.fn().mockResolvedValue(Response.json({ data: "ok" }));
    const response = await guard(handler)(req);
    return { handler, response };
}

async function errorCode(response: Response): Promise<string> {
    const body = (await response.json()) as { error: { code: string } };
    return body.error.code;
}

beforeEach(() => {
    resolveApiActorMock.mockReset();
    findByReferenceIdMock.mockReset();
    recordSessionMock.mockReset();
    findByReferenceIdMock.mockImplementation((uid: string) =>
        Promise.resolve(PROFILES[uid] ?? null)
    );
});

describe("requireOwnAccountApi", () => {
    it("lets a common user act on their own profile", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: OWNER_UID });

        for (const method of ["GET", ...MUTATING_METHODS]) {
            const { handler, response } = await call(asOwner(method));

            expect(response.status).toBe(HTTP_STATUS.OK);
            expect(handler.mock.calls[0]?.[1].subjectProfile).toEqual(
                PROFILES[OWNER_UID]
            );
        }
    });

    it("lets an admin without impersonation act on their own profile", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: ADMIN_UID });

        for (const method of ["GET", ...MUTATING_METHODS]) {
            const { handler, response } = await call(asAdminSelf(method));

            expect(response.status).toBe(HTTP_STATUS.OK);
            expect(handler.mock.calls[0]?.[1].subjectProfile).toEqual(
                PROFILES[ADMIN_UID]
            );
            expect(handler.mock.calls[0]?.[1].user).toEqual({
                uid: ADMIN_UID,
            });
        }
        expect(recordSessionMock).not.toHaveBeenCalled();
    });

    it("serves reads to an impersonating admin with the impersonated subject and records the window", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: ADMIN_UID });

        const { handler, response } = await call(asImpersonatingAdmin("GET"));

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(handler.mock.calls[0]?.[1].subjectProfile).toEqual(
            PROFILES[TARGET_UID]
        );
        expect(recordSessionMock).toHaveBeenCalledWith(
            expect.objectContaining({
                actorUid: ADMIN_UID,
                subjectUid: TARGET_UID,
            })
        );
    });

    it("refuses every write while the admin impersonates", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: ADMIN_UID });

        for (const method of MUTATING_METHODS) {
            const { handler, response } = await call(
                asImpersonatingAdmin(method)
            );

            expect(handler).not.toHaveBeenCalled();
            expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
            expect(await errorCode(response)).toBe(
                "AUTH_REQUEST_IMPERSONATION_READ_ONLY"
            );
        }
    });

    it("refuses an admin pointing the admin role at another admin", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: ADMIN_UID });

        const { handler, response } = await call(
            request(
                "GET",
                headersFor(ADMIN_UID, UserRoleLevel.ADMIN, OTHER_ADMIN_UID)
            )
        );

        expect(handler).not.toHaveBeenCalled();
        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await errorCode(response)).toBe(
            "AUTH_REQUEST_ADMIN_TARGET_INVALID"
        );
    });

    it("refuses an admin impersonating another admin through the common role", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: ADMIN_UID });

        const { handler, response } = await call(
            request(
                "GET",
                headersFor(ADMIN_UID, UserRoleLevel.COMMON, OTHER_ADMIN_UID)
            )
        );

        expect(handler).not.toHaveBeenCalled();
        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await errorCode(response)).toBe(
            "AUTH_REQUEST_IMPERSONATION_TARGET_INVALID"
        );
    });

    it("refuses a caller without a profile", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: OWNER_UID });
        findByReferenceIdMock.mockResolvedValue(null);

        const { handler, response } = await call(asOwner("GET"));

        expect(handler).not.toHaveBeenCalled();
        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await errorCode(response)).toBe("COMMON_PANEL_FORBIDDEN");
    });

    it("refuses an unauthenticated caller", async () => {
        resolveApiActorMock.mockResolvedValue(null);

        const { handler, response } = await call(asOwner("GET"));

        expect(handler).not.toHaveBeenCalled();
        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
        expect(await errorCode(response)).toBe("AUTH_INVALID_TOKEN");
    });

    it("leaves the common-panel guard closed to the admin acting on themself", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: ADMIN_UID });

        const { handler, response } = await call(
            asAdminSelf("GET"),
            requireCommonPanelApi
        );

        expect(handler).not.toHaveBeenCalled();
        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await errorCode(response)).toBe("COMMON_PANEL_FORBIDDEN");
    });
});
