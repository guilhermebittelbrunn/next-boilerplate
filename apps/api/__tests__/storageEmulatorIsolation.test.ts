import { UserRoleLevel } from "@repo/auth/types";
import { UserType } from "@repo/sdk/src/types";
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
    envMock,
    saveMock,
    getSignedUrlMock,
    bucketMock,
    resolveApiActorMock,
    findByReferenceIdMock,
    parseUploadedImageMock,
} = vi.hoisted(() => {
    const save = vi.fn();
    const getSignedUrl = vi.fn();
    const file = vi.fn(() => ({ save, getSignedUrl, delete: vi.fn() }));

    return {
        envMock: { FIREBASE_STORAGE_BUCKET: "" as string | undefined },
        saveMock: save,
        getSignedUrlMock: getSignedUrl,
        bucketMock: vi.fn(() => ({ file })),
        resolveApiActorMock: vi.fn(),
        findByReferenceIdMock: vi.fn(),
        parseUploadedImageMock: vi.fn(),
    };
});

vi.mock("@/env", () => ({ env: envMock }));

vi.mock("@repo/auth/server", () => ({
    getStorageAdmin: () => ({ bucket: bucketMock }),
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

vi.mock("@/(shared)/validation/file.schema", () => ({
    parseUploadedImage: (...args: unknown[]) => parseUploadedImageMock(...args),
}));

const { isStorageConfigured } = await import("@/(shared)/lib/storage");
const { withPhotoUrl } = await import("@/(shared)/lib/entity-photo");
const { POST } = await import("@/app/(routes)/files/route");

const REAL_BUCKET = "next-boilerplate-576d0.firebasestorage.app";
const AUTH_EMULATOR_HOST = "127.0.0.1:9099";
const FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
const OWNER_UID = "common-9";
const OWNER_PROFILE = {
    id: "p2",
    reference_id: OWNER_UID,
    type: UserType.COMMON,
};
const OWNED_OBJECT_PATH = `uploads/${OWNER_PROFILE.id}/11111111-2222-4333-8444-555555555555.png`;
const SIGNED_URL = "https://storage.googleapis.com/bucket/object?X-Goog-Sig=1";
const STATUS_CREATED = 201;

const clearEmulatorEnv = () => {
    vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", undefined);
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST", undefined);
    vi.stubEnv("FIRESTORE_EMULATOR_HOST", undefined);
};

function uploadRequest(): NextRequest {
    return {
        method: "POST",
        url: "http://localhost:3002/files",
        headers: new Headers({
            [AUTH_REQUEST_HEADER.USER_ID]: OWNER_UID,
            [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.COMMON,
            [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
            [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: OWNER_UID,
        }),
        formData: () => Promise.resolve(new FormData()),
    } as unknown as NextRequest;
}

const photoEntity = () =>
    ({
        id: "e1",
        name: "Seeded Unit",
        photo: OWNED_OBJECT_PATH,
    }) as never;

beforeEach(() => {
    vi.clearAllMocks();
    clearEmulatorEnv();
    envMock.FIREBASE_STORAGE_BUCKET = REAL_BUCKET;

    getSignedUrlMock.mockResolvedValue([SIGNED_URL]);
    saveMock.mockResolvedValue(undefined);
    resolveApiActorMock.mockResolvedValue({ uid: OWNER_UID });
    findByReferenceIdMock.mockResolvedValue(OWNER_PROFILE);
    parseUploadedImageMock.mockResolvedValue({
        ok: true,
        value: {
            body: Buffer.from("89504e47", "hex"),
            contentType: "image/png",
            extension: "png",
            size: 1024,
        },
    });
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("isStorageConfigured", () => {
    it("is true with a bucket and no emulator", () => {
        expect(isStorageConfigured()).toBe(true);
    });

    it.each([
        ["FIREBASE_AUTH_EMULATOR_HOST", AUTH_EMULATOR_HOST],
        ["NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST", AUTH_EMULATOR_HOST],
        ["FIRESTORE_EMULATOR_HOST", FIRESTORE_EMULATOR_HOST],
    ])(
        "is false with a bucket still filled in and %s set",
        (variable, host) => {
            vi.stubEnv(variable, host);

            expect(isStorageConfigured()).toBe(false);
        }
    );

    it("is false with a bucket and both emulator hosts set", () => {
        vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", AUTH_EMULATOR_HOST);
        vi.stubEnv("FIRESTORE_EMULATOR_HOST", FIRESTORE_EMULATOR_HOST);

        expect(isStorageConfigured()).toBe(false);
    });

    it("is true again when the emulator hosts are present but empty", () => {
        vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", "");
        vi.stubEnv("NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST", "");
        vi.stubEnv("FIRESTORE_EMULATOR_HOST", "");

        expect(isStorageConfigured()).toBe(true);
    });

    it.each([
        ["an emulated stack", AUTH_EMULATOR_HOST],
        ["a real stack", undefined],
    ])("is false without a bucket on %s", (_label, host) => {
        envMock.FIREBASE_STORAGE_BUCKET = "";
        vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", host);

        expect(isStorageConfigured()).toBe(false);
    });
});

describe("POST /files against an emulated stack", () => {
    it("writes nothing to the bucket when the auth emulator host is set", async () => {
        vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", AUTH_EMULATOR_HOST);

        const response = await POST(uploadRequest());

        expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
        const body = (await response.json()) as { error: { code: string } };
        expect(body.error.code).toBe("STORAGE_NOT_CONFIGURED");
        expect(bucketMock).not.toHaveBeenCalled();
        expect(saveMock).not.toHaveBeenCalled();
        expect(parseUploadedImageMock).not.toHaveBeenCalled();
    });

    it("writes nothing to the bucket when only the firestore emulator host is set", async () => {
        vi.stubEnv("FIRESTORE_EMULATOR_HOST", FIRESTORE_EMULATOR_HOST);

        const response = await POST(uploadRequest());

        expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
        expect(saveMock).not.toHaveBeenCalled();
    });

    it("still stores the object when no emulator host is set", async () => {
        const response = await POST(uploadRequest());

        expect(response.status).toBe(STATUS_CREATED);
        expect(bucketMock).toHaveBeenCalledWith(REAL_BUCKET);
        expect(saveMock).toHaveBeenCalledTimes(1);
    });
});

describe("reading an entity photo against an emulated stack", () => {
    it("does not sign a read url for a stored object", async () => {
        vi.stubEnv("FIREBASE_AUTH_EMULATOR_HOST", AUTH_EMULATOR_HOST);

        const result = await withPhotoUrl(photoEntity());

        expect(result.photoUrl).toBeNull();
        expect(bucketMock).not.toHaveBeenCalled();
        expect(getSignedUrlMock).not.toHaveBeenCalled();
    });

    it("signs a read url again with no emulator host", async () => {
        const result = await withPhotoUrl(photoEntity());

        expect(result.photoUrl).toBe(SIGNED_URL);
        expect(getSignedUrlMock).toHaveBeenCalledTimes(1);
    });
});
