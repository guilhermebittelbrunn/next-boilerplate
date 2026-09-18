import { UserRoleLevel } from "@repo/auth/types";
import { AuditAction, AuditTargetType, UserType } from "@repo/sdk/src/types";
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { encodeCursor } from "@/(shared)/lib/pagination";
import { PaginationCursorError } from "@/(shared)/repositories/base.repository";

const { resolveApiActorMock, findByReferenceIdMock, listPageMock } = vi.hoisted(
    () => ({
        resolveApiActorMock: vi.fn(),
        findByReferenceIdMock: vi.fn(),
        listPageMock: vi.fn(),
    })
);

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

vi.mock("@/(shared)/repositories/audit-event.repository", () => ({
    auditEventRepository: {
        listPage: (...args: unknown[]) => listPageMock(...args),
    },
}));

const { GET } = await import("@/app/(routes)/audit-events/route");

const ADMIN_UID = "admin-1";
const COMMON_UID = "common-9";

const ADMIN_PROFILE = {
    id: "p1",
    reference_id: ADMIN_UID,
    type: UserType.ADMIN,
};
const COMMON_PROFILE = {
    id: "p2",
    reference_id: COMMON_UID,
    type: UserType.COMMON,
};

function auditEvent(id: string) {
    return {
        id,
        action: AuditAction.USER_DELETE,
        actorUserId: "p1",
        actorUid: ADMIN_UID,
        actorLabel: "admin@example.com",
        onBehalfOfUserId: null,
        targetType: AuditTargetType.USER,
        targetUserId: "p2",
        targetLabel: "removed@example.com",
        changedFields: [],
        involvedUserIds: ["p1", "p2"],
        requestId: "req-1",
        windowEndsAt: null,
        createdAt: "2026-09-16T14:00:03.117Z",
        updatedAt: "2026-09-16T14:00:03.117Z",
        deletedAt: null,
    };
}

function listRequest(query = "", uid = ADMIN_UID): NextRequest {
    return {
        method: "GET",
        url: `http://localhost:3002/audit-events${query}`,
        headers: new Headers({
            [AUTH_REQUEST_HEADER.USER_ID]: uid,
            [AUTH_REQUEST_HEADER.USER_ROLE]:
                uid === ADMIN_UID ? UserRoleLevel.ADMIN : UserRoleLevel.COMMON,
            [AUTH_REQUEST_HEADER.REQUEST_ROLE]:
                uid === ADMIN_UID ? UserRoleLevel.ADMIN : UserRoleLevel.COMMON,
            [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: uid,
        }),
    } as unknown as NextRequest;
}

async function errorCode(response: Response): Promise<string> {
    const body = (await response.json()) as { error: { code: string } };
    return body.error.code;
}

async function pageOf(response: Response) {
    const body = (await response.json()) as {
        data: { items: { id: string }[]; nextCursor: string | null };
    };
    return body.data;
}

beforeEach(() => {
    for (const mock of [
        resolveApiActorMock,
        findByReferenceIdMock,
        listPageMock,
    ]) {
        mock.mockReset();
    }

    resolveApiActorMock.mockResolvedValue({ uid: ADMIN_UID });
    findByReferenceIdMock.mockResolvedValue(ADMIN_PROFILE);
    listPageMock.mockResolvedValue({
        items: [auditEvent("evt-1")],
        nextCursorId: null,
    });
});

describe("GET /audit-events", () => {
    it("answers the same page envelope the entity listing uses", async () => {
        const response = await GET(listRequest());

        expect(response.status).toBe(HTTP_STATUS.OK);
        const page = await pageOf(response);
        expect(page.items.map((row) => row.id)).toEqual(["evt-1"]);
        expect(page.nextCursor).toBeNull();
    });

    it("asks for no filter and the default page size when none is given", async () => {
        await GET(listRequest());

        expect(listPageMock).toHaveBeenCalledWith(
            { userId: undefined, from: undefined, to: undefined },
            { limit: 20, cursorId: null }
        );
    });

    it("passes the user filter and the period through to the repository", async () => {
        await GET(
            listRequest("?userId=p2&from=2026-09-01&to=2026-09-16&limit=5")
        );

        expect(listPageMock).toHaveBeenCalledWith(
            {
                userId: "p2",
                from: new Date("2026-09-01T00:00:00.000Z"),
                to: new Date("2026-09-16T23:59:59.999Z"),
            },
            { limit: 5, cursorId: null }
        );
    });

    it("hands back an opaque cursor when another page exists", async () => {
        listPageMock.mockResolvedValue({
            items: [auditEvent("evt-2"), auditEvent("evt-1")],
            nextCursorId: "evt-1",
        });

        const page = await pageOf(await GET(listRequest("?limit=2")));

        expect(page.nextCursor).toBe(encodeCursor("evt-1"));
        expect(page.nextCursor).not.toContain("evt-1");
    });

    it("refuses a range that ends before it starts", async () => {
        const response = await GET(
            listRequest("?from=2026-09-16&to=2026-09-01")
        );

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await errorCode(response)).toBe("VALIDATION_FAILED");
        expect(listPageMock).not.toHaveBeenCalled();
    });

    it("turns a cursor whose anchor vanished into a client error", async () => {
        listPageMock.mockRejectedValue(new PaginationCursorError("gone"));

        const response = await GET(
            listRequest(`?cursor=${encodeCursor("gone")}`)
        );

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await errorCode(response)).toBe("PAGINATION_CURSOR_INVALID");
    });

    it("degrades to 503 while the composite index is not published", async () => {
        listPageMock.mockRejectedValue(
            Object.assign(
                new Error(
                    "9 FAILED_PRECONDITION: The query requires an index. You can create it here: https://console.firebase.google.com/..."
                ),
                { code: 9 }
            )
        );

        const response = await GET(listRequest("?userId=p2"));

        expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
        expect(await errorCode(response)).toBe("PAGINATION_INDEX_MISSING");
    });

    it("lets an unrelated failure bubble up instead of mislabelling it", async () => {
        listPageMock.mockRejectedValue(new Error("deadline exceeded"));

        await expect(GET(listRequest())).rejects.toThrow("deadline exceeded");
    });
});

describe("GET /audit-events authorization", () => {
    it("refuses a caller whose profile is not an admin", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: COMMON_UID });
        findByReferenceIdMock.mockResolvedValue(COMMON_PROFILE);

        const response = await GET(listRequest("", COMMON_UID));

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await errorCode(response)).toBe("ADMIN_FORBIDDEN");
        expect(listPageMock).not.toHaveBeenCalled();
    });

    it("refuses an unauthenticated caller", async () => {
        resolveApiActorMock.mockResolvedValue(null);

        const response = await GET(listRequest());

        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
        expect(await errorCode(response)).toBe("AUTH_INVALID_TOKEN");
        expect(listPageMock).not.toHaveBeenCalled();
    });
});

describe("the audit route exposes no way to change a recorded event", () => {
    it("exports only GET", async () => {
        const handlers = await import("@/app/(routes)/audit-events/route");

        expect(Object.keys(handlers)).toEqual(["GET"]);
    });
});
