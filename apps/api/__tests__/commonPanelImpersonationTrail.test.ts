import { UserRoleLevel } from "@repo/auth/types";
import { UserType } from "@repo/sdk/src/types";
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    resolveApiActorMock,
    findByReferenceIdMock,
    recordImpersonationSessionMock,
} = vi.hoisted(() => ({
    resolveApiActorMock: vi.fn(),
    findByReferenceIdMock: vi.fn(),
    recordImpersonationSessionMock: vi.fn(),
}));

vi.mock("@/(shared)/lib/audit-recorder", () => ({
    recordAuditEvent: vi.fn(),
    recordImpersonationSession: (...args: unknown[]) =>
        recordImpersonationSessionMock(...args),
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
const ADMIN_EMAIL = "admin@example.com";
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
        headers: new Headers({ "x-request-id": "req-19", ...headers }),
    } as unknown as NextRequest;
}

function asOwner(method = "GET") {
    return request(method, {
        [AUTH_REQUEST_HEADER.USER_ID]: OWNER_UID,
        [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.COMMON,
        [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
        [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: OWNER_UID,
    });
}

function asImpersonatingAdmin(method = "GET") {
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

function recordedSession() {
    return recordImpersonationSessionMock.mock.calls[0]?.[0];
}

beforeEach(() => {
    for (const mock of [
        resolveApiActorMock,
        findByReferenceIdMock,
        recordImpersonationSessionMock,
    ]) {
        mock.mockReset();
    }
    findByReferenceIdMock.mockImplementation((uid: string) => {
        if (uid === ADMIN_UID) {
            return Promise.resolve(ADMIN_PROFILE);
        }
        if (uid === OWNER_UID) {
            return Promise.resolve(OWNER_PROFILE);
        }
        return Promise.resolve(TARGET_PROFILE);
    });
    recordImpersonationSessionMock.mockResolvedValue(undefined);
    resolveApiActorMock.mockResolvedValue({
        uid: ADMIN_UID,
        email: ADMIN_EMAIL,
    });
});

/**
 * Recording happens on the server, from the headers the impersonation needs anyway, so
 * the admin has no way of operating on someone's account without leaving a window behind.
 */
describe("requireCommonPanelApi records the impersonation window", () => {
    it("records the admin as the actor and the impersonated user as the subject", async () => {
        await call(asImpersonatingAdmin());

        expect(recordedSession()).toEqual({
            actorUserId: ADMIN_PROFILE.id,
            actorUid: ADMIN_UID,
            actorLabel: ADMIN_EMAIL,
            subjectUserId: TARGET_PROFILE.id,
            subjectUid: TARGET_UID,
            requestId: "req-19",
        });
    });

    it("records a read, which is the only thing impersonation still allows", async () => {
        for (const method of ["GET", "HEAD", "OPTIONS"]) {
            recordImpersonationSessionMock.mockClear();

            const { response } = await call(asImpersonatingAdmin(method));

            expect(response.status).toBe(HTTP_STATUS.OK);
            expect(recordImpersonationSessionMock).toHaveBeenCalledTimes(1);
        }
    });

    it("records nothing when the user is acting on their own data", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: OWNER_UID });

        const { response } = await call(asOwner());

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(recordImpersonationSessionMock).not.toHaveBeenCalled();
    });

    it("records nothing for a write refused by the read-only rule", async () => {
        const { response } = await call(asImpersonatingAdmin("POST"));

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(recordImpersonationSessionMock).not.toHaveBeenCalled();
    });

    it("records nothing for a caller without credentials", async () => {
        resolveApiActorMock.mockResolvedValue(null);

        await call(asImpersonatingAdmin());

        expect(recordImpersonationSessionMock).not.toHaveBeenCalled();
    });

    it("records nothing when the impersonated profile is not a common user", async () => {
        findByReferenceIdMock.mockResolvedValue(ADMIN_PROFILE);

        const { response } = await call(asImpersonatingAdmin());

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(recordImpersonationSessionMock).not.toHaveBeenCalled();
    });

    it("hands the request to the route after the window is written", async () => {
        const order: string[] = [];
        recordImpersonationSessionMock.mockImplementation(() => {
            order.push("record");
            return Promise.resolve();
        });
        const handler = vi.fn().mockImplementation(() => {
            order.push("handler");
            return Promise.resolve(Response.json({ data: "ok" }));
        });

        await requireCommonPanelApi(handler)(asImpersonatingAdmin());

        expect(order).toEqual(["record", "handler"]);
    });

    it("falls back to the display name when the admin account has no email", async () => {
        resolveApiActorMock.mockResolvedValue({
            uid: ADMIN_UID,
            email: undefined,
            displayName: "Admin Sem E-mail",
        });

        await call(asImpersonatingAdmin());

        expect(recordedSession().actorLabel).toBe("Admin Sem E-mail");
    });
});
