import { randomUUID } from "node:crypto";
import { UserRoleLevel } from "@repo/auth/types";
import { UserType } from "@repo/sdk/src/types";
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
    resolveApiActorMock,
    findByReferenceIdMock,
    updateMock,
    getMergedUserByFirestoreDocIdMock,
} = vi.hoisted(() => ({
    resolveApiActorMock: vi.fn(),
    findByReferenceIdMock: vi.fn(),
    updateMock: vi.fn(),
    getMergedUserByFirestoreDocIdMock: vi.fn(),
}));

vi.mock("@/env", () => ({
    env: { FIREBASE_STORAGE_BUCKET: "a-real-bucket.firebasestorage.app" },
}));

vi.mock("@/(shared)/lib/billing", () => ({ isBillingEnabled: () => false }));

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
        update: (...args: unknown[]) => updateMock(...args),
    },
}));

vi.mock("@/(shared)/lib/user-merge", () => ({
    getMergedUserByFirestoreDocId: (...args: unknown[]) =>
        getMergedUserByFirestoreDocIdMock(...args),
}));

const {
    deleteObjectsByPrefix,
    isStorageConfigured,
    listObjectPaths,
    ownerPrefix,
    putObject,
} = await import("@/(shared)/lib/storage");
const { POST } = await import("@/app/(routes)/files/route");
const { PUT } = await import("@/app/(routes)/account/route");

const EMULATOR_BUCKET_BASE = `http://${process.env.FIREBASE_STORAGE_EMULATOR_HOST}/demo-next-boilerplate.appspot.com/`;
const STATUS_CREATED = 201;
const STATUS_OK = 200;

/** A complete 1x1 transparent PNG, so the bytes read back can be compared exactly. */
const PNG_1X1 = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    "base64"
);

const OWNER_UID = `emu-owner-${randomUUID()}`;
const OWNER_ID = `emu-profile-${randomUUID()}`;
const OTHER_OWNER_ID = `emu-other-${randomUUID()}`;

const ownerProfile = (avatar: string | null = null) => ({
    id: OWNER_ID,
    reference_id: OWNER_UID,
    type: UserType.COMMON,
    avatar,
});

const ownerHeaders = () => ({
    [AUTH_REQUEST_HEADER.USER_ID]: OWNER_UID,
    [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.COMMON,
    [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
    [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: OWNER_UID,
});

const objectPath = (ownerId: string) =>
    `${ownerPrefix(ownerId)}${randomUUID()}.png`;

const emulatorUrl = (path: string) => `${EMULATOR_BUCKET_BASE}${path}`;

function uploadRequest(bytes: Buffer): NextRequest {
    const form = new FormData();
    form.append(
        "file",
        new File([new Uint8Array(bytes)], "pixel.png", { type: "image/png" })
    );
    return new Request("http://localhost:3002/files", {
        method: "POST",
        headers: ownerHeaders(),
        body: form,
    }) as unknown as NextRequest;
}

function accountRequest(body: unknown): NextRequest {
    return new Request("http://localhost:3002/account", {
        method: "PUT",
        headers: { ...ownerHeaders(), "content-type": "application/json" },
        body: JSON.stringify(body),
    }) as unknown as NextRequest;
}

beforeEach(() => {
    vi.clearAllMocks();
    resolveApiActorMock.mockResolvedValue({ uid: OWNER_UID });
    findByReferenceIdMock.mockResolvedValue(ownerProfile());
    updateMock.mockResolvedValue(undefined);
});

afterAll(async () => {
    await deleteObjectsByPrefix(ownerPrefix(OWNER_ID));
    await deleteObjectsByPrefix(ownerPrefix(OTHER_OWNER_ID));
});

describe("storage under the emulator", () => {
    it("is configured with a real bucket name still in the env", () => {
        expect(isStorageConfigured()).toBe(true);
    });
});

describe("POST /files against the storage emulator", () => {
    it("stores the image under the caller's prefix and hands back a url that opens it", async () => {
        const response = await POST(uploadRequest(PNG_1X1));

        expect(response.status).toBe(STATUS_CREATED);
        const { data } = (await response.json()) as {
            data: { path: string; url: string; expiresAt: string };
        };
        expect(data.path.startsWith(ownerPrefix(OWNER_ID))).toBe(true);
        expect(data.url).toBe(emulatorUrl(data.path));
        expect(await listObjectPaths(ownerPrefix(OWNER_ID))).toContain(
            data.path
        );

        const read = await fetch(data.url);
        expect(read.status).toBe(STATUS_OK);
        expect(read.headers.get("content-type")).toBe("image/png");
        expect(Buffer.from(await read.arrayBuffer()).equals(PNG_1X1)).toBe(
            true
        );
    });
});

describe("PUT /account avatar against the storage emulator", () => {
    it("removes the previous own avatar once the new one is saved", async () => {
        const previous = objectPath(OWNER_ID);
        const next = objectPath(OWNER_ID);
        await putObject(previous, PNG_1X1, "image/png");
        await putObject(next, PNG_1X1, "image/png");
        findByReferenceIdMock.mockResolvedValue(ownerProfile(previous));
        getMergedUserByFirestoreDocIdMock.mockResolvedValue({
            uid: OWNER_UID,
            avatar: next,
        });

        const response = await PUT(accountRequest({ avatar: next }));

        expect(response.status).toBe(STATUS_OK);
        expect(updateMock).toHaveBeenCalledWith(
            expect.objectContaining({ id: OWNER_ID, avatar: next })
        );
        const paths = await listObjectPaths(ownerPrefix(OWNER_ID));
        expect(paths).toContain(next);
        expect(paths).not.toContain(previous);
        expect((await fetch(emulatorUrl(previous))).status).toBe(
            HTTP_STATUS.NOT_FOUND
        );

        const { data } = (await response.json()) as {
            data: { avatarUrl: string };
        };
        expect(data.avatarUrl).toBe(emulatorUrl(next));
        expect((await fetch(data.avatarUrl)).status).toBe(STATUS_OK);
    });

    it("refuses an existing object of another owner and leaves it in place", async () => {
        const foreign = objectPath(OTHER_OWNER_ID);
        await putObject(foreign, PNG_1X1, "image/png");

        const response = await PUT(accountRequest({ avatar: foreign }));

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        const body = (await response.json()) as { error: { code: string } };
        expect(body.error.code).toBe("ACCOUNT_AVATAR_INVALID");
        expect(updateMock).not.toHaveBeenCalled();
        expect(await listObjectPaths(ownerPrefix(OTHER_OWNER_ID))).toContain(
            foreign
        );
    });
});
