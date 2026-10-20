import { UserRoleLevel } from "@repo/auth/types";
import { UserType } from "@repo/sdk/src/types";
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    resolveApiActorMock,
    findByReferenceIdMock,
    listByUserIdMock,
    countUnreadMock,
    findByIdMock,
    markReadMock,
    markAllReadMock,
} = vi.hoisted(() => ({
    resolveApiActorMock: vi.fn(),
    findByReferenceIdMock: vi.fn(),
    listByUserIdMock: vi.fn(),
    countUnreadMock: vi.fn(),
    findByIdMock: vi.fn(),
    markReadMock: vi.fn(),
    markAllReadMock: vi.fn(),
}));

vi.mock("@/env", () => ({ env: {} }));

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

vi.mock("@/(shared)/repositories/notification.repository", () => ({
    notificationRepository: {
        listByUserId: (...args: unknown[]) => listByUserIdMock(...args),
        countUnreadByUserId: (...args: unknown[]) => countUnreadMock(...args),
        findById: (...args: unknown[]) => findByIdMock(...args),
        markRead: (...args: unknown[]) => markReadMock(...args),
        markAllReadByUserId: (...args: unknown[]) => markAllReadMock(...args),
    },
}));

const { GET: listNotifications } = await import(
    "@/app/(routes)/notifications/route"
);
const { GET: unreadCount } = await import(
    "@/app/(routes)/notifications/unread-count/route"
);
const { POST: markRead } = await import(
    "@/app/(routes)/notifications/[id]/read/route"
);
const { POST: markAllRead } = await import(
    "@/app/(routes)/notifications/read-all/route"
);

const ADMIN_UID = "admin-1";
const TARGET_UID = "common-9";
const ADMIN_PROFILE = {
    id: "p1",
    reference_id: ADMIN_UID,
    type: UserType.ADMIN,
};
const TARGET_PROFILE = {
    id: "p2",
    reference_id: TARGET_UID,
    type: UserType.COMMON,
};

const TARGET_UNREAD = 4;

const READ_ONLY_REFUSAL = {
    error: { code: "AUTH_REQUEST_IMPERSONATION_READ_ONLY" },
};

function asImpersonatingAdmin(method: string): NextRequest {
    return {
        method,
        url: "http://localhost:3002/notifications",
        headers: new Headers({
            [AUTH_REQUEST_HEADER.USER_ID]: ADMIN_UID,
            [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.ADMIN,
            [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
            [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: TARGET_UID,
        }),
        json: () => Promise.resolve({}),
    } as unknown as NextRequest;
}

function asAdminOutsideImpersonation(method: string): NextRequest {
    return {
        method,
        url: "http://localhost:3002/notifications",
        headers: new Headers({
            [AUTH_REQUEST_HEADER.USER_ID]: ADMIN_UID,
            [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.ADMIN,
            [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
            [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: ADMIN_UID,
        }),
        json: () => Promise.resolve({}),
    } as unknown as NextRequest;
}

beforeEach(() => {
    vi.clearAllMocks();
    resolveApiActorMock.mockResolvedValue({ uid: ADMIN_UID });
    findByReferenceIdMock.mockImplementation((uid: string) =>
        Promise.resolve(uid === ADMIN_UID ? ADMIN_PROFILE : TARGET_PROFILE)
    );
    listByUserIdMock.mockResolvedValue({ items: [], nextCursorId: null });
    countUnreadMock.mockResolvedValue(TARGET_UNREAD);
    findByIdMock.mockResolvedValue({ id: "n1", userId: TARGET_PROFILE.id });
});

describe("notifications while an admin acts as another user", () => {
    it("lista as notificações do usuário personificado", async () => {
        const response = await listNotifications(asImpersonatingAdmin("GET"));

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(listByUserIdMock).toHaveBeenCalledWith(TARGET_PROFILE.id, {
            limit: 20,
            cursorId: null,
        });
    });

    it("conta as não lidas do usuário personificado", async () => {
        const response = await unreadCount(asImpersonatingAdmin("GET"));

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(await response.json()).toEqual({
            data: { count: TARGET_UNREAD },
        });
        expect(countUnreadMock).toHaveBeenCalledWith(TARGET_PROFILE.id);
    });

    it("recusa marcar uma como lida e não toca no repositório", async () => {
        const response = await markRead(asImpersonatingAdmin("POST"), {
            params: { id: "n1" },
        });

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await response.json()).toEqual(READ_ONLY_REFUSAL);
        expect(findByIdMock).not.toHaveBeenCalled();
        expect(markReadMock).not.toHaveBeenCalled();
    });

    it("recusa marcar todas como lidas e não toca no repositório", async () => {
        const response = await markAllRead(asImpersonatingAdmin("POST"));

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await response.json()).toEqual(READ_ONLY_REFUSAL);
        expect(markAllReadMock).not.toHaveBeenCalled();
    });
});

describe("notifications for an admin outside impersonation", () => {
    it("recusa o painel comum ao admin sem sujeito personificado", async () => {
        const response = await unreadCount(asAdminOutsideImpersonation("GET"));

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(countUnreadMock).not.toHaveBeenCalled();
    });
});
