import { UserRoleLevel } from "@repo/auth/types";
import { UserType } from "@repo/sdk/src/types";
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { Timestamp } from "firebase-admin/firestore";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    resolveApiActorMock,
    getUserMock,
    findByReferenceIdMock,
    findByIdMock,
    createMock,
} = vi.hoisted(() => ({
    resolveApiActorMock: vi.fn(),
    getUserMock: vi.fn(),
    findByReferenceIdMock: vi.fn(),
    findByIdMock: vi.fn(),
    createMock: vi.fn(),
}));

vi.mock("@/(shared)/lib/resolve-api-actor", () => ({
    resolveApiActor: (...args: unknown[]) => resolveApiActorMock(...args),
}));

vi.mock("@repo/auth/server", () => ({
    getAuthInstance: () => ({ getUser: getUserMock, updateUser: vi.fn() }),
    getCurrentUser: vi.fn(),
}));

vi.mock("@/(shared)/repositories/user.repository", () => ({
    userRepository: {
        findByReferenceId: (...args: unknown[]) =>
            findByReferenceIdMock(...args),
        findById: (...args: unknown[]) => findByIdMock(...args),
        create: (...args: unknown[]) => createMock(...args),
    },
}));

const { GET: getMe } = await import("@/app/(routes)/auth/me/route");
const { GET: getUserById } = await import("@/app/(routes)/users/[id]/route");

const ADMIN_UID = "auth-admin";
const COMMON_UID = "auth-common";
const CREATED_AT_ISO = "2024-03-01T10:00:00.000Z";
const UPDATED_AT_ISO = "2024-05-02T08:30:00.000Z";

function authRecord(uid: string) {
    return {
        uid,
        email: `${uid}@example.com`,
        emailVerified: true,
        displayName: null,
        photoURL: null,
        phoneNumber: null,
        disabled: false,
        metadata: {
            creationTime: "Mon, 01 Jan 2024 00:00:00 GMT",
            lastSignInTime: null,
            lastRefreshTime: null,
        },
        providerData: [],
        customClaims: null,
        tokensValidAfterTime: undefined,
    };
}

function storedProfile(id: string, uid: string, type: UserType) {
    return {
        id,
        reference_id: uid,
        type,
        createdAt: Timestamp.fromDate(new Date(CREATED_AT_ISO)),
        updatedAt: Timestamp.fromDate(new Date(UPDATED_AT_ISO)),
        deletedAt: null,
    };
}

const ADMIN_PROFILE = storedProfile("p1", ADMIN_UID, UserType.ADMIN);
const COMMON_PROFILE = storedProfile("p2", COMMON_UID, UserType.COMMON);

function request(method: string, panelRole: UserRoleLevel) {
    return {
        method,
        url: "http://localhost:3002/",
        headers: new Headers({
            [AUTH_REQUEST_HEADER.USER_ID]: ADMIN_UID,
            [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.ADMIN,
            [AUTH_REQUEST_HEADER.REQUEST_ROLE]: panelRole,
            [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: ADMIN_UID,
        }),
    } as unknown as NextRequest;
}

beforeEach(() => {
    resolveApiActorMock.mockReset();
    getUserMock.mockReset();
    findByReferenceIdMock.mockReset();
    findByIdMock.mockReset();
    createMock.mockReset();

    resolveApiActorMock.mockResolvedValue(authRecord(ADMIN_UID));
    getUserMock.mockImplementation((uid: string) =>
        Promise.resolve(authRecord(uid))
    );
    findByReferenceIdMock.mockImplementation((uid: string) =>
        Promise.resolve(uid === ADMIN_UID ? ADMIN_PROFILE : COMMON_PROFILE)
    );
    findByIdMock.mockResolvedValue(COMMON_PROFILE);
});

describe("GET /auth/me", () => {
    it("answers with the profile timestamps as ISO strings", async () => {
        const response = await getMe(request("GET", UserRoleLevel.ADMIN));
        const body = await response.json();

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(body.data.createdAt).toBe(CREATED_AT_ISO);
        expect(body.data.updatedAt).toBe(UPDATED_AT_ISO);
        expect(body.data.deletedAt).toBeNull();
        expect(body.data.uid).toBe(ADMIN_UID);
    });

    it("never leaks the raw Firestore Timestamp shape", async () => {
        const response = await getMe(request("GET", UserRoleLevel.ADMIN));

        expect(JSON.stringify(await response.json())).not.toContain("_seconds");
    });

    it("refuses a caller without a valid credential", async () => {
        resolveApiActorMock.mockResolvedValue(null);

        const response = await getMe(request("GET", UserRoleLevel.ADMIN));

        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    });
});

describe("GET /users/:id", () => {
    const routeContext = { params: Promise.resolve({ id: "p2" }) };

    it("formats createdAt the same way the listing does", async () => {
        const response = await getUserById(
            request("GET", UserRoleLevel.ADMIN),
            routeContext
        );
        const body = await response.json();

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(body.data.createdAt).toBe(CREATED_AT_ISO);
        expect(body.data.updatedAt).toBe(UPDATED_AT_ISO);
        expect(JSON.stringify(body)).not.toContain("_seconds");
    });

    it("answers 404 when neither the document id nor the auth uid resolves", async () => {
        findByIdMock.mockResolvedValue(null);
        getUserMock.mockRejectedValue(new Error("no user"));

        const response = await getUserById(
            request("GET", UserRoleLevel.ADMIN),
            routeContext
        );

        expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
        expect(await response.json()).toEqual({
            error: { code: "USERS_NOT_FOUND" },
        });
    });

    it("refuses a caller whose profile is not an admin", async () => {
        findByReferenceIdMock.mockResolvedValue(COMMON_PROFILE);

        const response = await getUserById(
            request("GET", UserRoleLevel.ADMIN),
            routeContext
        );

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await response.json()).toEqual({
            error: { code: "ADMIN_FORBIDDEN" },
        });
    });

    it("refuses an unauthenticated caller", async () => {
        resolveApiActorMock.mockResolvedValue(null);

        const response = await getUserById(
            request("GET", UserRoleLevel.ADMIN),
            routeContext
        );

        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    });
});
