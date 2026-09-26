import { UserRoleLevel } from "@repo/auth/types";
import { UserType } from "@repo/sdk/src/types";
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import {
    PASSWORD_MAX_LENGTH,
    PASSWORD_MIN_LENGTH,
} from "@repo/shared/utils/helpers/passwordPolicy";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    resolveApiActorMock,
    findByReferenceIdMock,
    listMock,
    getAuthMock,
    identitySignUpMock,
    FakeIdentityToolkitError,
} = vi.hoisted(() => ({
    resolveApiActorMock: vi.fn(),
    findByReferenceIdMock: vi.fn(),
    listMock: vi.fn(),
    getAuthMock: vi.fn(),
    identitySignUpMock: vi.fn(),
    FakeIdentityToolkitError: class extends Error {},
}));

vi.mock("@/(shared)/lib/resolve-api-actor", () => ({
    resolveApiActor: (...args: unknown[]) => resolveApiActorMock(...args),
}));

vi.mock("@/(shared)/repositories/user.repository", () => ({
    userRepository: {
        findByReferenceId: (...args: unknown[]) =>
            findByReferenceIdMock(...args),
        touchLastAccess: vi.fn(),
        list: (...args: unknown[]) => listMock(...args),
    },
}));

vi.mock("@repo/auth/server", () => ({
    getAuthInstance: () => getAuthMock(),
    getCurrentUser: vi.fn(),
}));

vi.mock("@/(shared)/lib/firebase-identity-toolkit", () => ({
    identitySignUp: (...args: unknown[]) => identitySignUpMock(...args),
    IdentityToolkitError: FakeIdentityToolkitError,
}));

const { GET, POST } = await import("@/app/(routes)/users/route");

const ACTOR_UID = "admin-1";
const TARGET_UID = "common-9";

const ADMIN_PROFILE = {
    id: "p1",
    reference_id: ACTOR_UID,
    type: UserType.ADMIN,
};
const TARGET_PROFILE = {
    id: "p2",
    reference_id: TARGET_UID,
    type: UserType.COMMON,
};

const COMMON_USER = {
    id: "p2",
    reference_id: TARGET_UID,
    type: UserType.COMMON,
};

function request(panel: UserRoleLevel, search = "") {
    const impersonating = panel === UserRoleLevel.COMMON;
    return {
        method: "GET",
        url: `http://localhost:3002/users${search}`,
        headers: new Headers({
            [AUTH_REQUEST_HEADER.USER_ID]: ACTOR_UID,
            [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.ADMIN,
            [AUTH_REQUEST_HEADER.REQUEST_ROLE]: panel,
            [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: impersonating
                ? TARGET_UID
                : ACTOR_UID,
        }),
    } as any;
}

function createRequest(body: unknown) {
    return {
        method: "POST",
        url: "http://localhost:3002/users",
        headers: new Headers({
            [AUTH_REQUEST_HEADER.USER_ID]: ACTOR_UID,
            [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.ADMIN,
            [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.ADMIN,
            [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: ACTOR_UID,
        }),
        json: () => Promise.resolve(body),
    } as any;
}

beforeEach(() => {
    identitySignUpMock.mockReset();
    resolveApiActorMock.mockReset();
    findByReferenceIdMock.mockReset();
    listMock.mockReset();
    resolveApiActorMock.mockResolvedValue({ uid: ACTOR_UID });
    findByReferenceIdMock.mockImplementation((uid: string) =>
        Promise.resolve(uid === ACTOR_UID ? ADMIN_PROFILE : TARGET_PROFILE)
    );
    listMock.mockResolvedValue([COMMON_USER]);
});

describe("GET /users scope", () => {
    it("returns every user when the admin panel asks for no type", async () => {
        const response = await GET(request(UserRoleLevel.ADMIN));

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(await response.json()).toEqual({ data: [COMMON_USER] });
        expect(listMock).toHaveBeenCalledWith(undefined);
    });

    it("narrows by type when the admin panel asks for one", async () => {
        await GET(request(UserRoleLevel.ADMIN, "?type=admin"));

        expect(listMock).toHaveBeenCalledWith({ type: UserType.ADMIN });
    });

    it("ignores a type it does not recognise", async () => {
        await GET(request(UserRoleLevel.ADMIN, "?type=superuser"));

        expect(listMock).toHaveBeenCalledWith(undefined);
    });

    it("forces the common scope when the caller acts as a common user", async () => {
        await GET(request(UserRoleLevel.COMMON));

        expect(listMock).toHaveBeenCalledWith({ type: UserType.COMMON });
    });

    it("keeps the common scope even when the query string asks for admins", async () => {
        const response = await GET(
            request(UserRoleLevel.COMMON, "?type=admin")
        );

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(listMock).toHaveBeenCalledWith({ type: UserType.COMMON });
    });

    it("refuses a caller whose profile is not an admin", async () => {
        findByReferenceIdMock.mockResolvedValue(TARGET_PROFILE);

        const response = await GET(request(UserRoleLevel.ADMIN));

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await response.json()).toEqual({
            error: { code: "ADMIN_FORBIDDEN" },
        });
        expect(listMock).not.toHaveBeenCalled();
    });

    it("refuses an unauthenticated caller", async () => {
        resolveApiActorMock.mockResolvedValue(null);

        const response = await GET(request(UserRoleLevel.ADMIN));

        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
        expect(listMock).not.toHaveBeenCalled();
    });
});

describe("POST /users password policy", () => {
    const body = (password: string) => ({
        email: "qa-password-policy-admin@example.com",
        password,
        type: UserType.COMMON,
    });

    it("refuses a password one character short without creating the account", async () => {
        const response = await POST(
            createRequest(body("a".repeat(PASSWORD_MIN_LENGTH - 1)))
        );

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await response.json()).toEqual({
            error: { code: "AUTH_PASSWORD_TOO_SHORT" },
        });
        expect(identitySignUpMock).not.toHaveBeenCalled();
    });

    it("refuses a password past the ceiling as a validation failure", async () => {
        const response = await POST(
            createRequest(body("a".repeat(PASSWORD_MAX_LENGTH + 1)))
        );

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await response.json()).toEqual({
            error: { code: "VALIDATION_FAILED" },
        });
        expect(identitySignUpMock).not.toHaveBeenCalled();
    });

    it("lets a password at the minimum reach the provider", async () => {
        identitySignUpMock.mockRejectedValue(
            new FakeIdentityToolkitError("EMAIL_EXISTS")
        );
        const password = "a".repeat(PASSWORD_MIN_LENGTH);

        const response = await POST(createRequest(body(password)));

        expect(identitySignUpMock).toHaveBeenCalledWith(
            "qa-password-policy-admin@example.com",
            password
        );
        expect(await response.json()).toEqual({
            error: { code: "USERS_AUTH_EMAIL_ALREADY_IN_USE" },
        });
    });
});
