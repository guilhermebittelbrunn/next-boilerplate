import { UserRoleLevel } from "@repo/auth/types";
import { EntityType, UserType } from "@repo/sdk/src/types";
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    resolveApiActorMock,
    findByReferenceIdMock,
    listByUserIdMock,
    findByIdMock,
    createMock,
    updateMock,
    deleteMock,
} = vi.hoisted(() => ({
    resolveApiActorMock: vi.fn(),
    findByReferenceIdMock: vi.fn(),
    listByUserIdMock: vi.fn(),
    findByIdMock: vi.fn(),
    createMock: vi.fn(),
    updateMock: vi.fn(),
    deleteMock: vi.fn(),
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

vi.mock("@/(shared)/repositories/entity.repository", () => ({
    entityRepository: {
        listByUserId: (...args: unknown[]) => listByUserIdMock(...args),
        findById: (...args: unknown[]) => findByIdMock(...args),
        create: (...args: unknown[]) => createMock(...args),
        update: (...args: unknown[]) => updateMock(...args),
        delete: (...args: unknown[]) => deleteMock(...args),
    },
}));

const { GET, POST } = await import("@/app/(routes)/entities/route");
const {
    GET: GET_BY_ID,
    PUT,
    DELETE,
} = await import("@/app/(routes)/entities/[id]/route");

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

const ENTITY_ID = "entity-1";
const TARGET_ENTITY = {
    id: ENTITY_ID,
    userId: TARGET_PROFILE.id,
    name: "Acme",
    description: "A customer",
    type: EntityType.CUSTOMER,
    photo: null,
    genre: null,
    birthdate: null,
    enabled: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
};

const VALID_BODY = {
    name: "Acme",
    description: "A customer",
    type: EntityType.CUSTOMER,
};

function request(
    method: string,
    headers: Record<string, string>,
    body?: unknown
): NextRequest {
    return {
        method,
        url: `http://localhost:3002/entities/${ENTITY_ID}`,
        headers: new Headers(headers),
        json: () => Promise.resolve(body ?? {}),
    } as unknown as NextRequest;
}

function asImpersonatingAdmin(method: string, body?: unknown) {
    return request(
        method,
        {
            [AUTH_REQUEST_HEADER.USER_ID]: ADMIN_UID,
            [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.ADMIN,
            [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
            [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: TARGET_UID,
        },
        body
    );
}

function asOwner(method: string, body?: unknown) {
    return request(
        method,
        {
            [AUTH_REQUEST_HEADER.USER_ID]: TARGET_UID,
            [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.COMMON,
            [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
            [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: TARGET_UID,
        },
        body
    );
}

const idContext = { params: { id: ENTITY_ID } };

const STATUS_CREATED = 201;
const STATUS_NO_CONTENT = 204;

const READ_ONLY_REFUSAL = {
    error: { code: "AUTH_REQUEST_IMPERSONATION_READ_ONLY" },
};

function writeCallCounts() {
    return {
        created: createMock.mock.calls.length,
        updated: updateMock.mock.calls.length,
        deleted: deleteMock.mock.calls.length,
    };
}

const NO_WRITES = { created: 0, updated: 0, deleted: 0 };

beforeEach(() => {
    for (const mock of [
        resolveApiActorMock,
        findByReferenceIdMock,
        listByUserIdMock,
        findByIdMock,
        createMock,
        updateMock,
        deleteMock,
    ]) {
        mock.mockReset();
    }

    findByReferenceIdMock.mockImplementation((uid: string) =>
        Promise.resolve(uid === ADMIN_UID ? ADMIN_PROFILE : TARGET_PROFILE)
    );
    listByUserIdMock.mockResolvedValue([TARGET_ENTITY]);
    findByIdMock.mockResolvedValue(TARGET_ENTITY);
    createMock.mockResolvedValue(TARGET_ENTITY);
    updateMock.mockResolvedValue(undefined);
    deleteMock.mockResolvedValue(undefined);
});

describe("entities routes while an admin acts as another user", () => {
    beforeEach(() => {
        resolveApiActorMock.mockResolvedValue({ uid: ADMIN_UID });
    });

    it("serves the impersonated user's list", async () => {
        const response = await GET(asImpersonatingAdmin("GET"));

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(await response.json()).toEqual({ data: [TARGET_ENTITY] });
        expect(listByUserIdMock).toHaveBeenCalledWith(TARGET_PROFILE.id);
    });

    it("serves a single record of the impersonated user", async () => {
        const response = await GET_BY_ID(
            asImpersonatingAdmin("GET"),
            idContext
        );

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(await response.json()).toEqual({ data: TARGET_ENTITY });
    });

    it("refuses to create and writes nothing", async () => {
        const response = await POST(asImpersonatingAdmin("POST", VALID_BODY));

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await response.json()).toEqual(READ_ONLY_REFUSAL);
        expect(writeCallCounts()).toEqual(NO_WRITES);
    });

    it("refuses to update and writes nothing", async () => {
        const response = await PUT(
            asImpersonatingAdmin("PUT", { name: "Renamed" }),
            idContext
        );

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await response.json()).toEqual(READ_ONLY_REFUSAL);
        expect(writeCallCounts()).toEqual(NO_WRITES);
    });

    it("refuses to delete and writes nothing", async () => {
        const response = await DELETE(
            asImpersonatingAdmin("DELETE"),
            idContext
        );

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await response.json()).toEqual(READ_ONLY_REFUSAL);
        expect(writeCallCounts()).toEqual(NO_WRITES);
    });

    /**
     * The toggle on the list is a PUT with a single field. It is the cheapest mutation to
     * reach by accident, so it gets its own case rather than riding on the generic update.
     */
    it("refuses the enabled toggle", async () => {
        const response = await PUT(
            asImpersonatingAdmin("PUT", { enabled: false }),
            idContext
        );

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await response.json()).toEqual(READ_ONLY_REFUSAL);
        expect(writeCallCounts()).toEqual(NO_WRITES);
    });

    /**
     * A malformed body must not turn the 403 into a 400: the refusal has to come from the
     * guard, before the route ever looks at what was sent.
     */
    it("refuses before validating the body", async () => {
        const response = await POST(asImpersonatingAdmin("POST", { name: 1 }));

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await response.json()).toEqual(READ_ONLY_REFUSAL);
        expect(writeCallCounts()).toEqual(NO_WRITES);
    });
});

describe("entities routes for the owner", () => {
    beforeEach(() => {
        resolveApiActorMock.mockResolvedValue({ uid: TARGET_UID });
    });

    it("creates a record", async () => {
        const response = await POST(asOwner("POST", VALID_BODY));

        expect(response.status).toBe(STATUS_CREATED);
        expect(createMock).toHaveBeenCalledWith(
            expect.objectContaining({ userId: TARGET_PROFILE.id })
        );
    });

    it("updates a record", async () => {
        const response = await PUT(
            asOwner("PUT", { name: "Renamed" }),
            idContext
        );

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(updateMock).toHaveBeenCalledWith(
            expect.objectContaining({ id: ENTITY_ID, name: "Renamed" })
        );
    });

    it("deletes a record", async () => {
        const response = await DELETE(asOwner("DELETE"), idContext);

        expect(response.status).toBe(STATUS_NO_CONTENT);
        expect(deleteMock).toHaveBeenCalledWith(ENTITY_ID);
    });

    it("returns 404 when the record belongs to another user", async () => {
        findByIdMock.mockResolvedValue({
            ...TARGET_ENTITY,
            userId: "someone-else",
        });

        const response = await PUT(
            asOwner("PUT", { name: "Renamed" }),
            idContext
        );

        expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
        expect(await response.json()).toEqual({
            error: { code: "ENTITY_NOT_FOUND" },
        });
        expect(updateMock).not.toHaveBeenCalled();
    });
});
