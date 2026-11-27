import { UserRoleLevel } from "@repo/auth/types";
import { AuditAction, AuditTargetType, UserType } from "@repo/sdk/src/types";
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
    createMock,
    recordAuditEventMock,
    getMergedUserMock,
    FakeIdentityToolkitError,
} = vi.hoisted(() => ({
    createMock: vi.fn(),
    recordAuditEventMock: vi.fn(),
    getMergedUserMock: vi.fn(),
    resolveApiActorMock: vi.fn(),
    findByReferenceIdMock: vi.fn(),
    listMock: vi.fn(),
    getAuthMock: vi.fn(),
    identitySignUpMock: vi.fn(),
    FakeIdentityToolkitError: class extends Error {},
}));

// The organization resolver reaches Firestore through the repositories; it is not what
// this file is about.
vi.mock("@/(shared)/lib/organization-membership", () => ({
    ensureOrganizationMembershipQuietly: vi.fn(),
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
        create: (...args: unknown[]) => createMock(...args),
    },
}));

vi.mock("@/(shared)/lib/audit-recorder", () => ({
    recordAuditEvent: (...args: unknown[]) => recordAuditEventMock(...args),
}));

vi.mock("@/(shared)/lib/user-merge", () => ({
    getMergedUserByFirestoreDocId: (...args: unknown[]) =>
        getMergedUserMock(...args),
}));

vi.mock("@/(shared)/lib/notifications", () => ({
    emitNotificationQuietly: vi.fn(),
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
    createMock.mockReset();
    recordAuditEventMock.mockReset();
    getMergedUserMock.mockReset();
    getAuthMock.mockReset();
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

describe("POST /users email ceiling", () => {
    const EMAIL_MAX = 320;
    const LOCAL_PART_MAX = 64;
    const DOMAIN_LABEL_MAX = 63;
    const LOCAL_PART = "a".repeat(LOCAL_PART_MAX);
    const TOP_LEVEL = "example.com";

    /** A syntactically valid address of exactly `length` characters, built from 63-character labels. */
    function emailOfLength(length: number): string {
        let domain = TOP_LEVEL;
        const budget = length - LOCAL_PART.length - 1;
        while (domain.length < budget) {
            const room = budget - domain.length - 1;
            domain = `${"b".repeat(Math.min(DOMAIN_LABEL_MAX, room))}.${domain}`;
        }
        return `${LOCAL_PART}@${domain}`;
    }

    const body = (email: string) => ({
        email,
        password: "a".repeat(PASSWORD_MIN_LENGTH),
        type: UserType.COMMON,
    });

    it("refuses an address one character past the ceiling without calling the provider", async () => {
        const email = emailOfLength(EMAIL_MAX + 1);
        expect(email).toHaveLength(EMAIL_MAX + 1);

        const response = await POST(createRequest(body(email)));

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await response.json()).toEqual({
            error: { code: "VALIDATION_FAILED" },
        });
        expect(identitySignUpMock).not.toHaveBeenCalled();
    });

    it("lets an address at the ceiling reach the provider", async () => {
        identitySignUpMock.mockRejectedValue(
            new FakeIdentityToolkitError("EMAIL_EXISTS")
        );
        const email = emailOfLength(EMAIL_MAX);
        expect(email).toHaveLength(EMAIL_MAX);

        await POST(createRequest(body(email)));

        expect(identitySignUpMock).toHaveBeenCalledWith(
            email,
            expect.any(String)
        );
    });
});

describe("POST /users leaves a trail", () => {
    const NEW_UID = "new-uid-3";
    const body = {
        email: "qa-audit-levels-created@example.com",
        password: "a".repeat(PASSWORD_MIN_LENGTH),
        type: UserType.COMMON,
    };
    const deleteUserMock = vi.fn();

    beforeEach(() => {
        resolveApiActorMock.mockResolvedValue({
            uid: ACTOR_UID,
            email: "admin@example.com",
        });
        identitySignUpMock.mockResolvedValue({ localId: NEW_UID });
        createMock.mockResolvedValue({
            id: "p3",
            reference_id: NEW_UID,
            type: UserType.COMMON,
        });
        getMergedUserMock.mockResolvedValue({ id: "p3" });
        deleteUserMock.mockReset();
        deleteUserMock.mockResolvedValue(undefined);
        getAuthMock.mockReturnValue({ deleteUser: deleteUserMock });
    });

    it("records user.create with the admin as actor and the new profile as target", async () => {
        const response = await POST(createRequest(body));

        expect(response.status).toBe(HTTP_STATUS.CREATED);
        expect(recordAuditEventMock).toHaveBeenCalledTimes(1);
        expect(recordAuditEventMock.mock.calls[0]?.[0]).toMatchObject({
            action: AuditAction.USER_CREATE,
            actorUserId: "p1",
            actorUid: ACTOR_UID,
            actorLabel: "admin@example.com",
            targetType: AuditTargetType.USER,
            targetUserId: "p3",
            targetLabel: "qa-audit-levels-created@example.com",
        });
    });

    it("records nothing when the profile cannot be created", async () => {
        createMock.mockRejectedValue(new Error("unavailable"));

        const response = await POST(createRequest(body));

        expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
        expect(await response.json()).toEqual({
            error: { code: "USERS_PROFILE_CREATE_FAILED" },
        });
        expect(recordAuditEventMock).not.toHaveBeenCalled();
    });

    it("records nothing when the provider refuses the account", async () => {
        identitySignUpMock.mockRejectedValue(
            new FakeIdentityToolkitError("EMAIL_EXISTS")
        );

        await POST(createRequest(body));

        expect(recordAuditEventMock).not.toHaveBeenCalled();
    });
});
