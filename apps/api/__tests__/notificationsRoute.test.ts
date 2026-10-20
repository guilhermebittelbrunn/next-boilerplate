import { UserRoleLevel } from "@repo/auth/types";
import { UserType } from "@repo/sdk/src/types";
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { encodeCursor } from "@/(shared)/lib/pagination";
import { PaginationCursorError } from "@/(shared)/repositories/base.repository";

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

const OWNER_UID = "common-9";
const OWNER_PROFILE = {
    id: "p2",
    reference_id: OWNER_UID,
    type: UserType.COMMON,
};
const READ_AT = "2026-10-19T08:31:00.000Z";
const UNREAD = 7;
const MARKED = 3;
const FIRESTORE_DOCUMENT_ID_MAX_LENGTH = 1500;

function notification(id: string, overrides: Record<string, unknown> = {}) {
    return {
        id,
        userId: OWNER_PROFILE.id,
        type: "welcome",
        params: {},
        readAt: null,
        expiresAt: "2027-01-18T12:00:00.000Z",
        createdAt: "2026-10-20T12:00:00.000Z",
        updatedAt: "2026-10-20T12:00:00.000Z",
        deletedAt: null,
        ...overrides,
    };
}

function ownerRequest(method: string, path: string): NextRequest {
    return {
        method,
        url: `http://localhost:3002${path}`,
        headers: new Headers({
            [AUTH_REQUEST_HEADER.USER_ID]: OWNER_UID,
            [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.COMMON,
            [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
            [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: OWNER_UID,
        }),
        json: () => Promise.resolve({}),
    } as unknown as NextRequest;
}

const idContext = (id: string) => ({ params: { id } });

function missingIndexError() {
    return Object.assign(
        new Error("9 FAILED_PRECONDITION: The query requires an index."),
        { code: 9 }
    );
}

async function errorCode(response: Response): Promise<string> {
    const body = (await response.json()) as { error: { code: string } };
    return body.error.code;
}

beforeEach(() => {
    vi.clearAllMocks();
    resolveApiActorMock.mockResolvedValue({ uid: OWNER_UID });
    findByReferenceIdMock.mockResolvedValue(OWNER_PROFILE);
    listByUserIdMock.mockResolvedValue({ items: [], nextCursorId: null });
    countUnreadMock.mockResolvedValue(0);
    markReadMock.mockResolvedValue(READ_AT);
    markAllReadMock.mockResolvedValue(0);
});

describe("GET /notifications", () => {
    it("lista o dono com a página padrão e devolve o cursor codificado", async () => {
        listByUserIdMock.mockResolvedValue({
            items: [notification("n1")],
            nextCursorId: "n1",
        });

        const response = await listNotifications(
            ownerRequest("GET", "/notifications")
        );

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(await response.json()).toEqual({
            data: {
                items: [notification("n1")],
                nextCursor: encodeCursor("n1"),
            },
        });
        expect(listByUserIdMock).toHaveBeenCalledWith(OWNER_PROFILE.id, {
            limit: 20,
            cursorId: null,
        });
    });

    it("repassa o limite e o cursor decodificado", async () => {
        await listNotifications(
            ownerRequest(
                "GET",
                `/notifications?limit=10&cursor=${encodeCursor("n9")}`
            )
        );

        expect(listByUserIdMock).toHaveBeenCalledWith(OWNER_PROFILE.id, {
            limit: 10,
            cursorId: "n9",
        });
    });

    it("recusa um cursor forjado com 400 PAGINATION_CURSOR_INVALID", async () => {
        const response = await listNotifications(
            ownerRequest("GET", "/notifications?cursor=not-a-cursor")
        );

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await errorCode(response)).toBe("PAGINATION_CURSOR_INVALID");
        expect(listByUserIdMock).not.toHaveBeenCalled();
    });

    it("responde 400 quando o cursor aponta para um documento que sumiu", async () => {
        listByUserIdMock.mockRejectedValue(new PaginationCursorError("gone"));

        const response = await listNotifications(
            ownerRequest("GET", `/notifications?cursor=${encodeCursor("gone")}`)
        );

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await errorCode(response)).toBe("PAGINATION_CURSOR_INVALID");
    });

    it("responde 503 PAGINATION_INDEX_MISSING sem o índice publicado", async () => {
        listByUserIdMock.mockRejectedValue(missingIndexError());

        const response = await listNotifications(
            ownerRequest("GET", "/notifications")
        );

        expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
        expect(await errorCode(response)).toBe("PAGINATION_INDEX_MISSING");
    });
});

describe("GET /notifications/unread-count", () => {
    it("conta as não lidas do dono", async () => {
        countUnreadMock.mockResolvedValue(UNREAD);

        const response = await unreadCount(
            ownerRequest("GET", "/notifications/unread-count")
        );

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(await response.json()).toEqual({ data: { count: UNREAD } });
        expect(countUnreadMock).toHaveBeenCalledWith(OWNER_PROFILE.id);
    });

    it("responde 503 NOTIFICATIONS_INDEX_MISSING sem o índice publicado", async () => {
        countUnreadMock.mockRejectedValue(missingIndexError());

        const response = await unreadCount(
            ownerRequest("GET", "/notifications/unread-count")
        );

        expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
        expect(await errorCode(response)).toBe("NOTIFICATIONS_INDEX_MISSING");
    });

    it("deixa outra falha subir em vez de mascará-la de índice", async () => {
        countUnreadMock.mockRejectedValue(new TypeError("firestore down"));

        await expect(
            unreadCount(ownerRequest("GET", "/notifications/unread-count"))
        ).rejects.toThrow(TypeError);
    });
});

describe("POST /notifications/[id]/read", () => {
    it("marca a notificação do dono e devolve o instante gravado", async () => {
        findByIdMock.mockResolvedValue(notification("n1"));

        const response = await markRead(
            ownerRequest("POST", "/notifications/n1/read"),
            idContext("n1")
        );

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(await response.json()).toEqual({
            data: { id: "n1", readAt: READ_AT },
        });
        expect(markReadMock).toHaveBeenCalledWith("n1");
    });

    it("responde 404 NOTIFICATION_NOT_FOUND para um id que não existe", async () => {
        findByIdMock.mockResolvedValue(null);

        const response = await markRead(
            ownerRequest("POST", "/notifications/nope/read"),
            idContext("nope")
        );

        expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
        expect(await errorCode(response)).toBe("NOTIFICATION_NOT_FOUND");
        expect(markReadMock).not.toHaveBeenCalled();
    });

    it("responde 404 para a notificação de outro dono, sem gravar", async () => {
        findByIdMock.mockResolvedValue(
            notification("n1", { userId: "someone-else" })
        );

        const response = await markRead(
            ownerRequest("POST", "/notifications/n1/read"),
            idContext("n1")
        );

        expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
        expect(await errorCode(response)).toBe("NOTIFICATION_NOT_FOUND");
        expect(markReadMock).not.toHaveBeenCalled();
    });

    it("devolve o readAt original de uma notificação já lida, sem regravar", async () => {
        const firstRead = "2026-10-01T00:00:00.000Z";
        findByIdMock.mockResolvedValue(
            notification("n1", { readAt: firstRead })
        );

        const response = await markRead(
            ownerRequest("POST", "/notifications/n1/read"),
            idContext("n1")
        );

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(await response.json()).toEqual({
            data: { id: "n1", readAt: firstRead },
        });
        expect(markReadMock).not.toHaveBeenCalled();
    });

    it.each([
        ["com barra", "a/b"],
        ["reservado", "__reserved__"],
        ["ponto duplo", ".."],
        ["ponto", "."],
        [
            "acima do limite do Firestore",
            "x".repeat(FIRESTORE_DOCUMENT_ID_MAX_LENGTH + 1),
        ],
    ])(
        "responde 404 NOTIFICATION_NOT_FOUND a um id %s, sem tocar no repositório",
        async (_label, id) => {
            const response = await markRead(
                ownerRequest("POST", "/notifications/x/read"),
                idContext(id)
            );

            expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
            expect(await errorCode(response)).toBe("NOTIFICATION_NOT_FOUND");
            expect(findByIdMock).not.toHaveBeenCalled();
            expect(markReadMock).not.toHaveBeenCalled();
        }
    );
});

describe("POST /notifications/read-all", () => {
    it("marca todas do dono e diz quantas", async () => {
        markAllReadMock.mockResolvedValue(MARKED);

        const response = await markAllRead(
            ownerRequest("POST", "/notifications/read-all")
        );

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(await response.json()).toEqual({ data: { updated: MARKED } });
        expect(markAllReadMock).toHaveBeenCalledWith(OWNER_PROFILE.id);
    });

    it("responde 503 NOTIFICATIONS_INDEX_MISSING sem o índice publicado", async () => {
        markAllReadMock.mockRejectedValue(missingIndexError());

        const response = await markAllRead(
            ownerRequest("POST", "/notifications/read-all")
        );

        expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
        expect(await errorCode(response)).toBe("NOTIFICATIONS_INDEX_MISSING");
    });
});
