import { UserRoleLevel } from "@repo/auth/types";
import { UserType } from "@repo/sdk/src/types";
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
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

const { requireAdminApi } = await import("@/app/(guards)/admin");

const ACTOR_UID = "admin-1";
const TARGET_UID = "common-9";

const ADMIN_PROFILE = {
    id: "p1",
    reference_id: ACTOR_UID,
    type: UserType.ADMIN,
};
const TARGET_PROFILE = {
    id: "p2",
    reference_id: TARGET_UID,
    type: UserType.COMMON,
};

function request(method: string, panel: UserRoleLevel) {
    const impersonating = panel === UserRoleLevel.COMMON;
    return {
        method,
        headers: new Headers({
            [AUTH_REQUEST_HEADER.USER_ID]: ACTOR_UID,
            [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.ADMIN,
            [AUTH_REQUEST_HEADER.REQUEST_ROLE]: panel,
            [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: impersonating
                ? TARGET_UID
                : ACTOR_UID,
        }),
        // biome-ignore lint/suspicious/noExplicitAny: minimal NextRequest stand-in
    } as any;
}

async function call(method: string, panel: UserRoleLevel) {
    const handler = vi.fn().mockResolvedValue(Response.json({ data: "ok" }));
    const response = await requireAdminApi(handler)(request(method, panel));
    return { handler, response };
}

beforeEach(() => {
    resolveApiActorMock.mockReset();
    findByReferenceIdMock.mockReset();
    resolveApiActorMock.mockResolvedValue({ uid: ACTOR_UID });
    findByReferenceIdMock.mockImplementation((uid: string) =>
        Promise.resolve(uid === ACTOR_UID ? ADMIN_PROFILE : TARGET_PROFILE)
    );
});

describe("requireAdminApi", () => {
    it("lets an admin through in the admin panel", async () => {
        for (const method of ["GET", "POST", "PUT", "DELETE"]) {
            const { handler, response } = await call(
                method,
                UserRoleLevel.ADMIN
            );
            expect(handler).toHaveBeenCalled();
            expect(response.status).toBe(HTTP_STATUS.OK);
        }
    });

    /**
     * The impersonation picker is fed by `GET /users`. Refusing reads while impersonating
     * locks the admin into the first user they switched to, with no way back.
     */
    it("still serves reads while the admin acts as a common user", async () => {
        for (const method of ["GET", "HEAD", "OPTIONS"]) {
            const { handler, response } = await call(
                method,
                UserRoleLevel.COMMON
            );
            expect(handler).toHaveBeenCalled();
            expect(response.status).toBe(HTTP_STATUS.OK);
        }
    });

    it("refuses writes while the admin acts as a common user", async () => {
        for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
            const { handler, response } = await call(
                method,
                UserRoleLevel.COMMON
            );
            expect(handler).not.toHaveBeenCalled();
            expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
            expect(await response.json()).toEqual({
                error: { code: "AUTH_REQUEST_PANEL_FORBIDDEN" },
            });
        }
    });

    it("refuses anyone who is not an admin", async () => {
        findByReferenceIdMock.mockResolvedValue(TARGET_PROFILE);
        const { handler, response } = await call("GET", UserRoleLevel.ADMIN);

        expect(handler).not.toHaveBeenCalled();
        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await response.json()).toEqual({
            error: { code: "ADMIN_FORBIDDEN" },
        });
    });

    it("refuses an unauthenticated caller", async () => {
        resolveApiActorMock.mockResolvedValue(null);
        const { handler, response } = await call("GET", UserRoleLevel.ADMIN);

        expect(handler).not.toHaveBeenCalled();
        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    });
});
