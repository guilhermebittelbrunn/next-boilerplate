import { UserRoleLevel } from "@repo/auth/types";
import { UserType } from "@repo/sdk/src/types";
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    resolveApiActorMock,
    findByReferenceIdMock,
    updateMock,
    updateUserMock,
    getMergedUserByFirestoreDocIdMock,
    deleteObjectQuietlyMock,
} = vi.hoisted(() => ({
    resolveApiActorMock: vi.fn(),
    findByReferenceIdMock: vi.fn(),
    updateMock: vi.fn(),
    updateUserMock: vi.fn(),
    getMergedUserByFirestoreDocIdMock: vi.fn(),
    deleteObjectQuietlyMock: vi.fn(),
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
        update: (...args: unknown[]) => updateMock(...args),
    },
}));

vi.mock("@/(shared)/lib/user-merge", () => ({
    getMergedUserByFirestoreDocId: (...args: unknown[]) =>
        getMergedUserByFirestoreDocIdMock(...args),
}));

vi.mock("@repo/auth/server", () => ({
    getAuthInstance: () => ({ updateUser: updateUserMock }),
    revokeUserSessions: vi.fn(),
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
}));

const { GET, PUT } = await import("@/app/(routes)/account/route");

const OWNER_UID = "common-9";
const OWNER_PROFILE = {
    id: "profile-1",
    reference_id: OWNER_UID,
    type: UserType.COMMON,
    avatar: null as string | null,
    preferences: undefined as unknown,
};
const OTHER_OBJECT =
    "uploads/someone-else/9f1c8e30-4b7a-4c21-9f2a-3c5b0d8e1a44.webp";

function request(method: string, body?: unknown): NextRequest {
    return {
        method,
        url: "http://localhost:3002/account",
        headers: new Headers({
            [AUTH_REQUEST_HEADER.USER_ID]: OWNER_UID,
            [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.COMMON,
            [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
            [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: OWNER_UID,
        }),
        json: () => Promise.resolve(body ?? {}),
    } as unknown as NextRequest;
}

async function codeOf(response: Response): Promise<string> {
    const body = (await response.json()) as { error: { code: string } };
    return body.error.code;
}

describe("/account", () => {
    beforeEach(() => {
        for (const mock of [
            resolveApiActorMock,
            findByReferenceIdMock,
            updateMock,
            updateUserMock,
            getMergedUserByFirestoreDocIdMock,
            deleteObjectQuietlyMock,
        ]) {
            mock.mockReset();
        }
        resolveApiActorMock.mockResolvedValue({
            uid: OWNER_UID,
            email: "owner@example.com",
        });
        findByReferenceIdMock.mockResolvedValue({ ...OWNER_PROFILE });
        getMergedUserByFirestoreDocIdMock.mockResolvedValue({
            uid: OWNER_UID,
            email: "owner@example.com",
            displayName: "Ana",
        });
    });

    it("reads the account of the caller, with preference defaults", async () => {
        const response = await GET(request("GET"));
        const body = (await response.json()) as {
            data: Record<string, unknown>;
        };

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(getMergedUserByFirestoreDocIdMock).toHaveBeenCalledWith(
            OWNER_PROFILE.id
        );
        expect(body.data.preferences).toEqual({
            theme: "system",
            locale: "pt-br",
        });
        expect(body.data.avatarUrl).toBeNull();
    });

    it("writes to the profile derived from the token, never to an id in the body", async () => {
        await PUT(request("PUT", { id: "someone-else", displayName: "Ana" }));

        expect(updateMock).not.toHaveBeenCalled();
        expect(updateUserMock).not.toHaveBeenCalled();
    });

    it("keeps the patch limited to the caller's own document", async () => {
        await PUT(request("PUT", { phone: " +55 51 99999-0000 " }));

        expect(updateMock).toHaveBeenCalledWith({
            id: OWNER_PROFILE.id,
            phone: "+55 51 99999-0000",
        });
    });

    it("refuses an avatar that belongs to another account", async () => {
        const response = await PUT(request("PUT", { avatar: OTHER_OBJECT }));

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await codeOf(response)).toBe("ACCOUNT_AVATAR_INVALID");
        expect(updateMock).not.toHaveBeenCalled();
    });

    it("merges preferences instead of replacing the stored map", async () => {
        findByReferenceIdMock.mockResolvedValue({
            ...OWNER_PROFILE,
            preferences: { theme: "dark", locale: "es" },
        });

        await PUT(request("PUT", { preferences: { theme: "light" } }));

        expect(updateMock).toHaveBeenCalledWith({
            id: OWNER_PROFILE.id,
            preferences: { theme: "light", locale: "es" },
        });
    });

    it("answers with a translatable code when the write fails", async () => {
        updateMock.mockRejectedValue(new Error("firestore is down"));

        const response = await PUT(request("PUT", { phone: "1" }));

        expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
        expect(await codeOf(response)).toBe("ACCOUNT_UPDATE_FAILED");
    });

    it("refuses every write while impersonating", async () => {
        const impersonated = {
            method: "PUT",
            url: "http://localhost:3002/account",
            headers: new Headers({
                [AUTH_REQUEST_HEADER.USER_ID]: "admin-1",
                [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.ADMIN,
                [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
                [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: OWNER_UID,
            }),
            json: () => Promise.resolve({ displayName: "Ana" }),
        } as unknown as NextRequest;
        resolveApiActorMock.mockResolvedValue({
            uid: "admin-1",
            email: "admin@example.com",
        });
        findByReferenceIdMock.mockResolvedValue({
            id: "admin-profile",
            reference_id: "admin-1",
            type: UserType.ADMIN,
        });

        const response = await PUT(impersonated);

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(updateMock).not.toHaveBeenCalled();
    });

    it("refuses a caller without a valid credential", async () => {
        resolveApiActorMock.mockResolvedValue(null);

        const response = await GET(request("GET"));

        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
        expect(await codeOf(response)).toBe("AUTH_INVALID_TOKEN");
    });

    it("answers 404 when the profile of the caller no longer exists", async () => {
        getMergedUserByFirestoreDocIdMock.mockResolvedValue(null);

        const response = await GET(request("GET"));

        expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
        expect(await codeOf(response)).toBe("USERS_NOT_FOUND");
    });
});

describe("/account — lifecycle of the previous avatar object", () => {
    const OWN_AVATAR =
        "uploads/profile-1/1111aaaa-2222-4bbb-8ccc-333344445555.png";
    const NEXT_AVATAR =
        "uploads/profile-1/6666bbbb-7777-4ccc-8ddd-888899990000.png";

    beforeEach(() => {
        for (const mock of [
            resolveApiActorMock,
            findByReferenceIdMock,
            updateMock,
            updateUserMock,
            getMergedUserByFirestoreDocIdMock,
            deleteObjectQuietlyMock,
        ]) {
            mock.mockReset();
        }
        resolveApiActorMock.mockResolvedValue({
            uid: OWNER_UID,
            email: "owner@example.com",
        });
        findByReferenceIdMock.mockResolvedValue({
            ...OWNER_PROFILE,
            avatar: OWN_AVATAR,
        });
        getMergedUserByFirestoreDocIdMock.mockResolvedValue({
            uid: OWNER_UID,
            email: "owner@example.com",
        });
    });

    it("deletes the replaced object only after the write lands", async () => {
        await PUT(request("PUT", { avatar: NEXT_AVATAR }));

        expect(updateMock).toHaveBeenCalledWith({
            id: OWNER_PROFILE.id,
            avatar: NEXT_AVATAR,
        });
        expect(deleteObjectQuietlyMock).toHaveBeenCalledWith(OWN_AVATAR);
    });

    it("keeps the stored object when the write fails", async () => {
        updateMock.mockRejectedValue(new Error("firestore is down"));

        await PUT(request("PUT", { avatar: NEXT_AVATAR }));

        expect(deleteObjectQuietlyMock).not.toHaveBeenCalled();
    });

    it("keeps the stored object when the request does not touch the avatar", async () => {
        await PUT(request("PUT", { phone: "+55 51 98888-0000" }));

        expect(deleteObjectQuietlyMock).not.toHaveBeenCalled();
    });

    it("keeps the stored object when the same reference is sent again", async () => {
        await PUT(request("PUT", { avatar: OWN_AVATAR }));

        expect(deleteObjectQuietlyMock).not.toHaveBeenCalled();
    });

    it("deletes the stored object when the avatar is cleared", async () => {
        await PUT(request("PUT", { avatar: null }));

        expect(updateMock).toHaveBeenCalledWith({
            id: OWNER_PROFILE.id,
            avatar: null,
        });
        expect(deleteObjectQuietlyMock).toHaveBeenCalledWith(OWN_AVATAR);
    });

    it("never deletes a stored reference that is not an object of this account", async () => {
        findByReferenceIdMock.mockResolvedValue({
            ...OWNER_PROFILE,
            avatar: "https://example.com/external.png",
        });

        await PUT(request("PUT", { avatar: NEXT_AVATAR }));

        expect(deleteObjectQuietlyMock).not.toHaveBeenCalled();
    });
});
