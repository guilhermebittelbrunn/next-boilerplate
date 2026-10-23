import { UserRoleLevel } from "@repo/auth/types";
import { EntityType, UserType } from "@repo/sdk/src/types";
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    resolveApiActorMock,
    findByReferenceIdMock,
    findInOrganizationMock,
    updateMock,
    deleteMock,
    deleteObjectQuietlyMock,
    resolveMembershipMock,
} = vi.hoisted(() => ({
    resolveApiActorMock: vi.fn(),
    findByReferenceIdMock: vi.fn(),
    findInOrganizationMock: vi.fn(),
    updateMock: vi.fn(),
    deleteMock: vi.fn(),
    deleteObjectQuietlyMock: vi.fn(),
    resolveMembershipMock: vi.fn(),
}));

vi.mock("@/(shared)/lib/billing", () => ({ isBillingEnabled: () => false }));
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

vi.mock("@/(shared)/lib/organization-membership", () => ({
    resolveOrganizationMembership: (...args: unknown[]) =>
        resolveMembershipMock(...args),
}));

vi.mock("@/(shared)/repositories/entity.repository", () => ({
    entityRepository: {
        findInOrganization: (...args: unknown[]) =>
            findInOrganizationMock(...args),
        update: (...args: unknown[]) => updateMock(...args),
        delete: (...args: unknown[]) => deleteMock(...args),
    },
}));

const STORAGE_OBJECT_PATH_RE =
    /^uploads\/[A-Za-z0-9_-]{1,128}\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

// Not `importActual`: the real module reaches Firebase Admin through `server-only`,
// which refuses to load outside a server component.
vi.mock("@/(shared)/lib/storage", () => ({
    isStorageConfigured: () => false,
    signReadUrl: vi.fn(),
    deleteObjectQuietly: (...args: unknown[]) =>
        deleteObjectQuietlyMock(...args),
    isStorageObjectPath: (value: string) => STORAGE_OBJECT_PATH_RE.test(value),
    isOwnedBy: (path: string, ownerId: string) =>
        path.startsWith(`uploads/${ownerId}/`),
    organizationOwnerSegment: (organizationId: string) =>
        `org-${organizationId}`,
}));

const {
    GET,
    PUT,
    DELETE: DELETE_BY_ID,
} = await import("@/app/(routes)/entities/[id]/route");

const ORGANIZATION_ID = "orgA";
const OWNER_ID = "owner-profile";
const MEMBER_UID = "member-uid";
const MEMBER_PROFILE = {
    id: "member-profile",
    reference_id: MEMBER_UID,
    type: UserType.COMMON,
};

const OBJECT_NAME = "9f1c8e30-4b7a-4c21-9f2a-3c5b0d8e1a44.webp";
const ORGANIZATION_PHOTO = `uploads/org-${ORGANIZATION_ID}/${OBJECT_NAME}`;
const OWNER_PERSONAL_PHOTO = `uploads/${OWNER_ID}/${OBJECT_NAME}`;
const MEMBER_PERSONAL_PHOTO = `uploads/${MEMBER_PROFILE.id}/${OBJECT_NAME}`;
const NEW_ORGANIZATION_PHOTO = `uploads/org-${ORGANIZATION_ID}/11111111-2222-4333-8444-555555555555.png`;

const ENTITY_ID = "entity-of-the-owner";
const STATUS_NO_CONTENT = 204;

/** Created by the owner; the caller in every test is a member of the same organization. */
const OWNERS_RECORD = {
    id: ENTITY_ID,
    organizationId: ORGANIZATION_ID,
    userId: OWNER_ID,
    name: "Acme",
    description: "Created by the owner",
    type: EntityType.CUSTOMER,
    photo: null as string | null,
    genre: null,
    birthdate: null,
    enabled: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    deletedAt: null,
};

function asMember(method: string, body?: unknown): NextRequest {
    return {
        method,
        url: `http://localhost:3002/entities/${ENTITY_ID}`,
        headers: new Headers({
            [AUTH_REQUEST_HEADER.USER_ID]: MEMBER_UID,
            [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.COMMON,
            [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
            [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: MEMBER_UID,
        }),
        json: () => Promise.resolve(body ?? {}),
    } as unknown as NextRequest;
}

const idContext = { params: { id: ENTITY_ID } };

async function errorCode(response: Response): Promise<string> {
    const body = (await response.json()) as { error: { code: string } };
    return body.error.code;
}

beforeEach(() => {
    for (const mock of [
        resolveApiActorMock,
        findByReferenceIdMock,
        findInOrganizationMock,
        updateMock,
        deleteMock,
        deleteObjectQuietlyMock,
        resolveMembershipMock,
    ]) {
        mock.mockReset();
    }

    resolveApiActorMock.mockResolvedValue({ uid: MEMBER_UID });
    findByReferenceIdMock.mockResolvedValue(MEMBER_PROFILE);
    resolveMembershipMock.mockResolvedValue({
        organizationId: ORGANIZATION_ID,
        role: "member",
    });
    findInOrganizationMock.mockResolvedValue(OWNERS_RECORD);
    updateMock.mockResolvedValue(ENTITY_ID);
    deleteMock.mockResolvedValue(undefined);
    deleteObjectQuietlyMock.mockResolvedValue(undefined);
});

describe("a record of another organization", () => {
    beforeEach(() => {
        findInOrganizationMock.mockResolvedValue(null);
    });

    it.each([
        ["GET", () => GET(asMember("GET"), idContext)],
        ["PUT", () => PUT(asMember("PUT", { name: "Taken" }), idContext)],
        ["DELETE", () => DELETE_BY_ID(asMember("DELETE"), idContext)],
    ] as const)(
        "answers 404 to %s and writes nothing",
        async (_method, call) => {
            const response = await call();

            expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
            expect(await errorCode(response)).toBe("ENTITY_NOT_FOUND");
            expect(findInOrganizationMock).toHaveBeenCalledWith(
                ENTITY_ID,
                ORGANIZATION_ID
            );
            expect(updateMock).not.toHaveBeenCalled();
            expect(deleteMock).not.toHaveBeenCalled();
        }
    );
});

describe("a record another member created", () => {
    it("is readable by the member", async () => {
        const response = await GET(asMember("GET"), idContext);

        expect(response.status).toBe(HTTP_STATUS.OK);
    });

    it("is editable by the member", async () => {
        const response = await PUT(
            asMember("PUT", { name: "Renamed by a member" }),
            idContext
        );

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(updateMock).toHaveBeenCalledWith(
            expect.objectContaining({
                id: ENTITY_ID,
                name: "Renamed by a member",
            })
        );
    });

    it("can be deleted by the member", async () => {
        const response = await DELETE_BY_ID(asMember("DELETE"), idContext);

        expect(response.status).toBe(STATUS_NO_CONTENT);
        expect(deleteMock).toHaveBeenCalledWith(ENTITY_ID);
    });
});

describe("the photo of a record another member created", () => {
    /** The edit form sends the current photo back on every save. */
    it("saves when the form sends back the author's own untouched photo", async () => {
        findInOrganizationMock.mockResolvedValue({
            ...OWNERS_RECORD,
            photo: OWNER_PERSONAL_PHOTO,
        });

        const response = await PUT(
            asMember("PUT", { name: "Renamed", photo: OWNER_PERSONAL_PHOTO }),
            idContext
        );

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(updateMock).toHaveBeenCalled();
        expect(deleteObjectQuietlyMock).not.toHaveBeenCalled();
    });

    it("refuses a new photo from the member's personal prefix", async () => {
        const response = await PUT(
            asMember("PUT", { photo: MEMBER_PERSONAL_PHOTO }),
            idContext
        );

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await errorCode(response)).toBe("ENTITY_PHOTO_INVALID");
        expect(updateMock).not.toHaveBeenCalled();
    });

    it("deletes the superseded organization photo", async () => {
        findInOrganizationMock.mockResolvedValue({
            ...OWNERS_RECORD,
            photo: ORGANIZATION_PHOTO,
        });

        await PUT(
            asMember("PUT", { photo: NEW_ORGANIZATION_PHOTO }),
            idContext
        );

        expect(deleteObjectQuietlyMock).toHaveBeenCalledWith(
            ORGANIZATION_PHOTO
        );
    });

    it("leaves the author's older personal photo in place", async () => {
        findInOrganizationMock.mockResolvedValue({
            ...OWNERS_RECORD,
            photo: OWNER_PERSONAL_PHOTO,
        });

        const response = await PUT(
            asMember("PUT", { photo: NEW_ORGANIZATION_PHOTO }),
            idContext
        );

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(deleteObjectQuietlyMock).not.toHaveBeenCalled();
    });
});
