import { UserRoleLevel } from "@repo/auth/types";
import { EntityType, UserType } from "@repo/sdk/src/types";
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    parseCreateEntity,
    parseUpdateEntity,
} from "@/(shared)/validation/entity.schema";

const {
    resolveApiActorMock,
    findByReferenceIdMock,
    listByUserIdMock,
    findByIdMock,
    createMock,
    updateMock,
    isStorageConfiguredMock,
    signReadUrlMock,
    deleteObjectQuietlyMock,
} = vi.hoisted(() => ({
    resolveApiActorMock: vi.fn(),
    findByReferenceIdMock: vi.fn(),
    listByUserIdMock: vi.fn(),
    findByIdMock: vi.fn(),
    createMock: vi.fn(),
    updateMock: vi.fn(),
    isStorageConfiguredMock: vi.fn(),
    signReadUrlMock: vi.fn(),
    deleteObjectQuietlyMock: vi.fn(),
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
        delete: vi.fn(),
    },
}));

const UPLOAD_PREFIX = "uploads";
const STORAGE_OBJECT_PATH_RE =
    /^uploads\/[A-Za-z0-9_-]{1,128}\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

// Not `importActual`: the real module reaches Firebase Admin through `server-only`,
// which refuses to load outside a server component.
vi.mock("@/(shared)/lib/storage", () => ({
    isStorageConfigured: () => isStorageConfiguredMock(),
    signReadUrl: (...args: unknown[]) => signReadUrlMock(...args),
    deleteObjectQuietly: (...args: unknown[]) =>
        deleteObjectQuietlyMock(...args),
    isStorageObjectPath: (value: string) => STORAGE_OBJECT_PATH_RE.test(value),
    isOwnedBy: (path: string, ownerId: string) =>
        path.startsWith(`${UPLOAD_PREFIX}/${ownerId}/`),
}));

const { GET, POST } = await import("@/app/(routes)/entities/route");
const { GET: GET_BY_ID, PUT } = await import(
    "@/app/(routes)/entities/[id]/route"
);
const { isUsablePhotoReference } = await import("@/(shared)/lib/entity-photo");

const OWNER_UID = "common-9";
const OWNER_PROFILE = {
    id: "p2",
    reference_id: OWNER_UID,
    type: UserType.COMMON,
};

const OWN_OBJECT = `uploads/${OWNER_PROFILE.id}/9f1c8e30-4b7a-4c21-9f2a-3c5b0d8e1a44.webp`;
const OTHER_OBJECT =
    "uploads/someone-else/9f1c8e30-4b7a-4c21-9f2a-3c5b0d8e1a44.webp";
const LEGACY_URL = "https://cdn.example.com/legacy.png";
const SIGNED_URL = "https://storage.googleapis.com/bucket/obj?X-Goog-Sig=1";

const ENTITY_ID = "entity-1";
const STATUS_CREATED = 201;

const baseEntity = {
    id: ENTITY_ID,
    userId: OWNER_PROFILE.id,
    name: "Acme",
    description: "A customer",
    type: EntityType.CUSTOMER,
    photo: null as string | null,
    genre: null,
    birthdate: null,
    enabled: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    deletedAt: null,
};

function request(method: string, body?: unknown): NextRequest {
    return {
        method,
        url: `http://localhost:3002/entities/${ENTITY_ID}`,
        headers: new Headers({
            [AUTH_REQUEST_HEADER.USER_ID]: OWNER_UID,
            [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.COMMON,
            [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
            [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: OWNER_UID,
        }),
        json: () => Promise.resolve(body ?? {}),
    } as unknown as NextRequest;
}

const idContext = { params: { id: ENTITY_ID } };

const VALID_BODY = {
    name: "Acme",
    description: "A customer",
    type: EntityType.CUSTOMER,
};

async function errorCode(response: Response): Promise<string> {
    const body = (await response.json()) as { error: { code: string } };
    return body.error.code;
}

beforeEach(() => {
    for (const mock of [
        resolveApiActorMock,
        findByReferenceIdMock,
        listByUserIdMock,
        findByIdMock,
        createMock,
        updateMock,
        isStorageConfiguredMock,
        signReadUrlMock,
        deleteObjectQuietlyMock,
    ]) {
        mock.mockReset();
    }

    resolveApiActorMock.mockResolvedValue({ uid: OWNER_UID });
    findByReferenceIdMock.mockResolvedValue(OWNER_PROFILE);
    findByIdMock.mockResolvedValue(baseEntity);
    createMock.mockImplementation((input: Record<string, unknown>) =>
        Promise.resolve({ ...baseEntity, ...input })
    );
    updateMock.mockResolvedValue(undefined);
    isStorageConfiguredMock.mockReturnValue(true);
    signReadUrlMock.mockResolvedValue({
        url: SIGNED_URL,
        expiresAt: "2026-09-11T01:03:00.000Z",
    });
    deleteObjectQuietlyMock.mockResolvedValue(undefined);
});

describe("the photo reference schema", () => {
    const accepted = ["", LEGACY_URL, "http://example.com/a.jpg", OWN_OBJECT];
    const refused = [
        "javascript:alert(1)",
        "data:image/png;base64,AAAA",
        "uploads/../../etc/passwd",
        "just some text",
    ];

    it.each(accepted)("accepts %s", (photo) => {
        expect(parseCreateEntity({ ...VALID_BODY, photo }).ok).toBe(true);
        expect(parseUpdateEntity({ photo }).ok).toBe(true);
    });

    it.each(refused)("refuses %s", (photo) => {
        expect(parseCreateEntity({ ...VALID_BODY, photo }).ok).toBe(false);
        expect(parseUpdateEntity({ photo }).ok).toBe(false);
    });

    it("still accepts an absent and a null reference", () => {
        expect(parseCreateEntity(VALID_BODY).ok).toBe(true);
        expect(parseCreateEntity({ ...VALID_BODY, photo: null }).ok).toBe(true);
    });
});

/**
 * The handler decides on its own rather than trusting the schema to have filtered the
 * value, so the two can never drift into a gap that reaches the signing step.
 */
describe("what counts as a usable reference", () => {
    const usable = [LEGACY_URL, "http://example.com/a.jpg", OWN_OBJECT];
    const refused = [
        OTHER_OBJECT,
        "uploads/../../etc/passwd",
        `uploads/${OWNER_PROFILE.id}x/9f1c8e30-4b7a-4c21-9f2a-3c5b0d8e1a44.webp`,
        `uploads/${OWNER_PROFILE.id}/9f1c8e30-4b7a-4c21-9f2a-3c5b0d8e1a44.svg`,
        "just some text",
        "javascript:alert(1)",
    ];

    it.each(usable)("accepts %s", (photo) => {
        expect(isUsablePhotoReference(photo, OWNER_PROFILE.id)).toBe(true);
    });

    it.each(refused)("refuses %s", (photo) => {
        expect(isUsablePhotoReference(photo, OWNER_PROFILE.id)).toBe(false);
    });
});

describe("ownership of the referenced object", () => {
    it("refuses to create a record pointing at another owner's object", async () => {
        const response = await POST(
            request("POST", { ...VALID_BODY, photo: OTHER_OBJECT })
        );

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await errorCode(response)).toBe("ENTITY_PHOTO_INVALID");
        expect(createMock).not.toHaveBeenCalled();
    });

    it("refuses to update a record to another owner's object", async () => {
        const response = await PUT(
            request("PUT", { photo: OTHER_OBJECT }),
            idContext
        );

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await errorCode(response)).toBe("ENTITY_PHOTO_INVALID");
        expect(updateMock).not.toHaveBeenCalled();
    });

    it("accepts the caller's own object", async () => {
        const response = await POST(
            request("POST", { ...VALID_BODY, photo: OWN_OBJECT })
        );

        expect(response.status).toBe(STATUS_CREATED);
        expect(createMock).toHaveBeenCalledWith(
            expect.objectContaining({ photo: OWN_OBJECT })
        );
    });

    it("stores an empty reference as null", async () => {
        const response = await POST(
            request("POST", { ...VALID_BODY, photo: "  " })
        );

        expect(response.status).toBe(STATUS_CREATED);
        expect(createMock).toHaveBeenCalledWith(
            expect.objectContaining({ photo: null })
        );
    });
});

describe("the derived photo url", () => {
    it("signs a bucket object on read and never persists the signature", async () => {
        findByIdMock.mockResolvedValue({ ...baseEntity, photo: OWN_OBJECT });

        const response = await GET_BY_ID(request("GET"), idContext);
        const body = (await response.json()) as {
            data: { photo: string; photoUrl: string };
        };

        expect(body.data.photo).toBe(OWN_OBJECT);
        expect(body.data.photoUrl).toBe(SIGNED_URL);
        expect(signReadUrlMock).toHaveBeenCalledWith(OWN_OBJECT);
        expect(updateMock).not.toHaveBeenCalled();
    });

    it("hands back a legacy external url untouched, without signing it", async () => {
        listByUserIdMock.mockResolvedValue([
            { ...baseEntity, photo: LEGACY_URL },
        ]);

        const response = await GET(request("GET"));
        const body = (await response.json()) as {
            data: { photo: string; photoUrl: string }[];
        };

        expect(body.data[0].photoUrl).toBe(LEGACY_URL);
        expect(signReadUrlMock).not.toHaveBeenCalled();
    });

    it("answers a null url when there is no photo", async () => {
        listByUserIdMock.mockResolvedValue([baseEntity]);

        const response = await GET(request("GET"));
        const body = (await response.json()) as {
            data: { photoUrl: string | null }[];
        };

        expect(body.data[0].photoUrl).toBeNull();
    });

    it("refuses to sign a stored value that is not a well-formed object path", async () => {
        listByUserIdMock.mockResolvedValue([
            { ...baseEntity, photo: "legacy junk that predates validation" },
        ]);

        const response = await GET(request("GET"));
        const body = (await response.json()) as {
            data: { photoUrl: string | null }[];
        };

        expect(body.data[0].photoUrl).toBeNull();
        expect(signReadUrlMock).not.toHaveBeenCalled();
    });

    it("leaves the url null when the fork has no bucket configured", async () => {
        isStorageConfiguredMock.mockReturnValue(false);
        listByUserIdMock.mockResolvedValue([
            { ...baseEntity, photo: OWN_OBJECT },
        ]);

        const response = await GET(request("GET"));
        const body = (await response.json()) as {
            data: { photoUrl: string | null }[];
        };

        expect(body.data[0].photoUrl).toBeNull();
        expect(signReadUrlMock).not.toHaveBeenCalled();
    });
});

describe("replacing the image", () => {
    const REPLACEMENT = `uploads/${OWNER_PROFILE.id}/11111111-2222-4333-8444-555555555555.png`;

    it("removes the superseded object, and only after the record is written", async () => {
        findByIdMock.mockResolvedValue({ ...baseEntity, photo: OWN_OBJECT });

        const response = await PUT(
            request("PUT", { photo: REPLACEMENT }),
            idContext
        );

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(updateMock).toHaveBeenCalled();
        expect(deleteObjectQuietlyMock).toHaveBeenCalledWith(OWN_OBJECT);
        expect(updateMock.mock.invocationCallOrder[0]).toBeLessThan(
            deleteObjectQuietlyMock.mock.invocationCallOrder[0] as number
        );
    });

    it("keeps the object when the reference did not change", async () => {
        findByIdMock.mockResolvedValue({ ...baseEntity, photo: OWN_OBJECT });

        await PUT(request("PUT", { photo: OWN_OBJECT }), idContext);

        expect(deleteObjectQuietlyMock).not.toHaveBeenCalled();
    });

    it("keeps the object when the update does not touch the photo", async () => {
        findByIdMock.mockResolvedValue({ ...baseEntity, photo: OWN_OBJECT });

        await PUT(request("PUT", { name: "Renamed" }), idContext);

        expect(deleteObjectQuietlyMock).not.toHaveBeenCalled();
    });

    it("removes the object when the photo is cleared", async () => {
        findByIdMock.mockResolvedValue({ ...baseEntity, photo: OWN_OBJECT });

        await PUT(request("PUT", { photo: "" }), idContext);

        expect(updateMock).toHaveBeenCalledWith(
            expect.objectContaining({ photo: null })
        );
        expect(deleteObjectQuietlyMock).toHaveBeenCalledWith(OWN_OBJECT);
    });

    /** A legacy external URL is not ours to delete. */
    it("never tries to delete an external url", async () => {
        findByIdMock.mockResolvedValue({ ...baseEntity, photo: LEGACY_URL });

        await PUT(request("PUT", { photo: REPLACEMENT }), idContext);

        expect(deleteObjectQuietlyMock).not.toHaveBeenCalled();
    });
});
