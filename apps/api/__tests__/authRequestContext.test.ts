import { UserRoleLevel } from "@repo/auth/types";
import { type UserDTO, UserType } from "@repo/sdk/src/types";
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findByReferenceIdMock } = vi.hoisted(() => ({
    findByReferenceIdMock: vi.fn(),
}));

vi.mock("@/(shared)/repositories/user.repository", () => ({
    userRepository: {
        findByReferenceId: (referenceId: string) =>
            findByReferenceIdMock(referenceId),
    },
}));

const { resolveAuthRequestContext } = await import(
    "@/(shared)/lib/auth-request-context"
);

type ResolveParams = Parameters<typeof resolveAuthRequestContext>;
type ResolveResult = Awaited<ReturnType<typeof resolveAuthRequestContext>>;

const ACTOR_UID = "actor-uid";
const TARGET_UID = "target-uid";

function request(headers: Record<string, string>): ResolveParams[0] {
    return { headers: new Headers(headers) } as unknown as ResolveParams[0];
}

function actor(uid = ACTOR_UID): ResolveParams[1] {
    return { uid } as unknown as ResolveParams[1];
}

function profile(type: UserType, referenceId = ACTOR_UID): UserDTO {
    return {
        id: `doc-${referenceId}`,
        type,
        reference_id: referenceId,
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
        updatedAt: new Date("2024-01-01T00:00:00.000Z"),
        deletedAt: null,
    };
}

async function rejection(result: ResolveResult) {
    if (result.ok) {
        throw new Error("expected the request context to be rejected");
    }
    const body = (await result.response.json()) as {
        error?: { code?: string };
    };
    return { status: result.response.status, code: body.error?.code };
}

function resolved(result: ResolveResult) {
    if (!result.ok) {
        throw new Error("expected the request context to resolve");
    }
    return result.data;
}

beforeEach(() => {
    findByReferenceIdMock.mockReset();
});

describe("resolveAuthRequestContext · rejections", () => {
    it("rejects when x-user-id does not match the token uid", async () => {
        const result = await resolveAuthRequestContext(
            request({ [AUTH_REQUEST_HEADER.USER_ID]: "someone-else" }),
            actor(),
            profile(UserType.COMMON)
        );

        expect(await rejection(result)).toEqual({
            status: 403,
            code: "AUTH_REQUEST_USER_ID_MISMATCH",
        });
    });

    it("rejects when x-user-role does not match the persisted profile", async () => {
        const result = await resolveAuthRequestContext(
            request({
                [AUTH_REQUEST_HEADER.USER_ID]: ACTOR_UID,
                [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.ADMIN,
            }),
            actor(),
            profile(UserType.COMMON)
        );

        expect(await rejection(result)).toEqual({
            status: 403,
            code: "AUTH_REQUEST_USER_ROLE_MISMATCH",
        });
    });

    it("rejects a common profile asking for the admin panel", async () => {
        const result = await resolveAuthRequestContext(
            request({
                [AUTH_REQUEST_HEADER.USER_ID]: ACTOR_UID,
                [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.COMMON,
                [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.ADMIN,
            }),
            actor(),
            profile(UserType.COMMON)
        );

        expect(await rejection(result)).toEqual({
            status: 403,
            code: "AUTH_REQUEST_PANEL_FORBIDDEN",
        });
    });

    it("rejects a common profile pointing the request at another user", async () => {
        const result = await resolveAuthRequestContext(
            request({
                [AUTH_REQUEST_HEADER.USER_ID]: ACTOR_UID,
                [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: TARGET_UID,
                [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
            }),
            actor(),
            profile(UserType.COMMON)
        );

        expect(await rejection(result)).toEqual({
            status: 403,
            code: "AUTH_REQUEST_IMPERSONATION_FORBIDDEN",
        });
    });

    it("rejects an admin in the admin panel targeting another user", async () => {
        const result = await resolveAuthRequestContext(
            request({
                [AUTH_REQUEST_HEADER.USER_ID]: ACTOR_UID,
                [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: TARGET_UID,
                [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.ADMIN,
            }),
            actor(),
            profile(UserType.ADMIN)
        );

        expect(await rejection(result)).toEqual({
            status: 403,
            code: "AUTH_REQUEST_ADMIN_TARGET_INVALID",
        });
    });

    it("rejects an admin in the common panel without a target", async () => {
        const result = await resolveAuthRequestContext(
            request({
                [AUTH_REQUEST_HEADER.USER_ID]: ACTOR_UID,
                [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: ACTOR_UID,
                [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
            }),
            actor(),
            profile(UserType.ADMIN)
        );

        expect(await rejection(result)).toEqual({
            status: 403,
            code: "AUTH_REQUEST_IMPERSONATION_REQUIRED",
        });
        expect(findByReferenceIdMock).not.toHaveBeenCalled();
    });

    it("rejects an admin impersonating a target that does not exist", async () => {
        findByReferenceIdMock.mockResolvedValue(null);

        const result = await resolveAuthRequestContext(
            request({
                [AUTH_REQUEST_HEADER.USER_ID]: ACTOR_UID,
                [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: TARGET_UID,
                [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
            }),
            actor(),
            profile(UserType.ADMIN)
        );

        expect(await rejection(result)).toEqual({
            status: 403,
            code: "AUTH_REQUEST_IMPERSONATION_TARGET_INVALID",
        });
        expect(findByReferenceIdMock).toHaveBeenCalledWith(TARGET_UID);
    });

    it("rejects an admin impersonating another admin", async () => {
        findByReferenceIdMock.mockResolvedValue(
            profile(UserType.ADMIN, TARGET_UID)
        );

        const result = await resolveAuthRequestContext(
            request({
                [AUTH_REQUEST_HEADER.USER_ID]: ACTOR_UID,
                [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: TARGET_UID,
                [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
            }),
            actor(),
            profile(UserType.ADMIN)
        );

        expect(await rejection(result)).toEqual({
            status: 403,
            code: "AUTH_REQUEST_IMPERSONATION_TARGET_INVALID",
        });
    });
});

describe("resolveAuthRequestContext · resolved contexts", () => {
    it("resolves a common user acting as themselves", async () => {
        const result = await resolveAuthRequestContext(
            request({
                [AUTH_REQUEST_HEADER.USER_ID]: ACTOR_UID,
                [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.COMMON,
                [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: ACTOR_UID,
                [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
            }),
            actor(),
            profile(UserType.COMMON)
        );

        expect(resolved(result)).toEqual({
            userId: ACTOR_UID,
            requestUserId: ACTOR_UID,
            userRole: UserRoleLevel.COMMON,
            requestRole: UserRoleLevel.COMMON,
            isImpersonating: false,
            userTimezone: null,
        });
    });

    it("resolves an admin in the admin panel", async () => {
        const result = await resolveAuthRequestContext(
            request({
                [AUTH_REQUEST_HEADER.USER_ID]: ACTOR_UID,
                [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.ADMIN,
                [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: ACTOR_UID,
                [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.ADMIN,
            }),
            actor(),
            profile(UserType.ADMIN)
        );

        expect(resolved(result)).toEqual({
            userId: ACTOR_UID,
            requestUserId: ACTOR_UID,
            userRole: UserRoleLevel.ADMIN,
            requestRole: UserRoleLevel.ADMIN,
            isImpersonating: false,
            userTimezone: null,
        });
    });

    it("resolves an admin impersonating a valid common target", async () => {
        findByReferenceIdMock.mockResolvedValue(
            profile(UserType.COMMON, TARGET_UID)
        );

        const result = await resolveAuthRequestContext(
            request({
                [AUTH_REQUEST_HEADER.USER_ID]: ACTOR_UID,
                [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.ADMIN,
                [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: TARGET_UID,
                [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
            }),
            actor(),
            profile(UserType.ADMIN)
        );

        expect(resolved(result)).toEqual({
            userId: ACTOR_UID,
            requestUserId: TARGET_UID,
            userRole: UserRoleLevel.ADMIN,
            requestRole: UserRoleLevel.COMMON,
            isImpersonating: true,
            userTimezone: null,
        });
    });

    it("falls back to the actor and their real role when the context headers are absent", async () => {
        const result = await resolveAuthRequestContext(
            request({}),
            actor(),
            profile(UserType.COMMON)
        );

        expect(resolved(result)).toEqual({
            userId: ACTOR_UID,
            requestUserId: ACTOR_UID,
            userRole: UserRoleLevel.COMMON,
            requestRole: UserRoleLevel.COMMON,
            isImpersonating: false,
            userTimezone: null,
        });
    });
});

describe("resolveAuthRequestContext · time zone", () => {
    it("keeps a valid IANA time zone", async () => {
        const result = await resolveAuthRequestContext(
            request({
                [AUTH_REQUEST_HEADER.USER_ID]: ACTOR_UID,
                [AUTH_REQUEST_HEADER.USER_TIMEZONE]: "America/Sao_Paulo",
            }),
            actor(),
            profile(UserType.COMMON)
        );

        expect(resolved(result).userTimezone).toBe("America/Sao_Paulo");
    });

    it("degrades an invalid time zone to null instead of rejecting", async () => {
        const result = await resolveAuthRequestContext(
            request({
                [AUTH_REQUEST_HEADER.USER_ID]: ACTOR_UID,
                [AUTH_REQUEST_HEADER.USER_TIMEZONE]: "Not/AZone",
            }),
            actor(),
            profile(UserType.COMMON)
        );

        expect(resolved(result).userTimezone).toBe(null);
    });

    it("resolves a null time zone when the header is absent", async () => {
        const result = await resolveAuthRequestContext(
            request({ [AUTH_REQUEST_HEADER.USER_ID]: ACTOR_UID }),
            actor(),
            profile(UserType.COMMON)
        );

        expect(resolved(result).userTimezone).toBe(null);
    });
});
