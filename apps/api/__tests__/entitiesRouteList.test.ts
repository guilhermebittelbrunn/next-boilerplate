import { UserRoleLevel } from "@repo/auth/types";
import { EntityType, UserType } from "@repo/sdk/src/types";
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { encodeCursor } from "@/(shared)/lib/pagination";
import { PaginationCursorError } from "@/(shared)/repositories/base.repository";

const { resolveApiActorMock, findByReferenceIdMock, listByUserIdMock } =
    vi.hoisted(() => ({
        resolveApiActorMock: vi.fn(),
        findByReferenceIdMock: vi.fn(),
        listByUserIdMock: vi.fn(),
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

vi.mock("@/(shared)/repositories/entity.repository", () => ({
    entityRepository: {
        listByUserId: (...args: unknown[]) => listByUserIdMock(...args),
        findById: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
    },
}));

// Not `importActual`: the real module reaches Firebase Admin through `server-only`,
// which refuses to load outside a server component.
vi.mock("@/(shared)/lib/storage", () => ({
    isStorageConfigured: () => false,
    signReadUrl: vi.fn(),
    deleteObjectQuietly: vi.fn(),
    isStorageObjectPath: () => false,
    isOwnedBy: () => false,
}));

const { GET } = await import("@/app/(routes)/entities/route");

const OWNER_UID = "common-9";
const OWNER_PROFILE = {
    id: "p2",
    reference_id: OWNER_UID,
    type: UserType.COMMON,
};

function entity(id: string) {
    return {
        id,
        userId: OWNER_PROFILE.id,
        name: `Entity ${id}`,
        description: "",
        type: EntityType.CUSTOMER,
        photo: null,
        genre: null,
        birthdate: null,
        enabled: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        deletedAt: null,
    };
}

function listRequest(query = ""): NextRequest {
    return {
        method: "GET",
        url: `http://localhost:3002/entities${query}`,
        headers: new Headers({
            [AUTH_REQUEST_HEADER.USER_ID]: OWNER_UID,
            [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.COMMON,
            [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
            [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: OWNER_UID,
        }),
        json: () => Promise.resolve({}),
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
        listByUserIdMock,
    ]) {
        mock.mockReset();
    }

    resolveApiActorMock.mockResolvedValue({ uid: OWNER_UID });
    findByReferenceIdMock.mockResolvedValue(OWNER_PROFILE);
    listByUserIdMock.mockResolvedValue({
        items: [entity("e1")],
        nextCursorId: null,
    });
});

describe("GET /entities", () => {
    it("answers a page envelope instead of a bare array", async () => {
        const response = await GET(listRequest());

        expect(response.status).toBe(HTTP_STATUS.OK);
        const page = await pageOf(response);
        expect(page.items.map((row) => row.id)).toEqual(["e1"]);
        expect(page.nextCursor).toBeNull();
    });

    it("scopes the query to the caller and uses the default page size", async () => {
        await GET(listRequest());

        expect(listByUserIdMock).toHaveBeenCalledWith(OWNER_PROFILE.id, {
            limit: 20,
            cursorId: null,
        });
    });

    it("hands back an opaque cursor when the repository reports another page", async () => {
        listByUserIdMock.mockResolvedValue({
            items: [entity("e2"), entity("e1")],
            nextCursorId: "e1",
        });

        const page = await pageOf(await GET(listRequest("?limit=2")));

        expect(page.nextCursor).toBe(encodeCursor("e1"));
        expect(page.nextCursor).not.toContain("e1");
    });

    it("resolves the cursor back into the anchor id for the repository", async () => {
        await GET(listRequest(`?limit=2&cursor=${encodeCursor("e1")}`));

        expect(listByUserIdMock).toHaveBeenCalledWith(OWNER_PROFILE.id, {
            limit: 2,
            cursorId: "e1",
        });
    });

    it("clamps an oversized page instead of letting the response grow", async () => {
        await GET(listRequest("?limit=99999"));

        expect(listByUserIdMock).toHaveBeenCalledWith(OWNER_PROFILE.id, {
            limit: 100,
            cursorId: null,
        });
    });

    it("refuses an invalid page size", async () => {
        const response = await GET(listRequest("?limit=0"));

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await errorCode(response)).toBe("VALIDATION_FAILED");
        expect(listByUserIdMock).not.toHaveBeenCalled();
    });

    it("refuses a forged cursor before touching the repository", async () => {
        const response = await GET(listRequest("?cursor=clearly-not-a-cursor"));

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await errorCode(response)).toBe("PAGINATION_CURSOR_INVALID");
        expect(listByUserIdMock).not.toHaveBeenCalled();
    });

    it("turns a cursor whose anchor vanished into a client error, not a crash", async () => {
        listByUserIdMock.mockRejectedValue(new PaginationCursorError("gone"));

        const response = await GET(
            listRequest(`?cursor=${encodeCursor("gone")}`)
        );

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await errorCode(response)).toBe("PAGINATION_CURSOR_INVALID");
    });

    it("degrades to 503 while the composite index is not published", async () => {
        listByUserIdMock.mockRejectedValue(
            Object.assign(
                new Error(
                    "9 FAILED_PRECONDITION: The query requires an index. You can create it here: https://console.firebase.google.com/..."
                ),
                { code: 9 }
            )
        );

        const response = await GET(listRequest());

        expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
        expect(await errorCode(response)).toBe("PAGINATION_INDEX_MISSING");
    });

    it("lets an unrelated failure bubble up instead of mislabelling it", async () => {
        listByUserIdMock.mockRejectedValue(new Error("deadline exceeded"));

        await expect(GET(listRequest())).rejects.toThrow("deadline exceeded");
    });
});
