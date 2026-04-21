import { UserRoleLevel } from "@repo/auth/types";
import { type UserDTO, UserType } from "@repo/sdk/src/types";
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { UserRecord } from "firebase-admin/auth";
import type { NextRequest } from "next/server";
import { userRepository } from "@/(shared)/repositories/user.repository";

export type ResolvedAuthRequestContext = {
    userId: string;
    requestUserId: string;
    userRole: UserRoleLevel;
    requestRole: UserRoleLevel;
    isImpersonating: boolean;
};

function forbidden(code: string) {
    return Response.json(
        { error: { code } },
        { status: HTTP_STATUS.FORBIDDEN }
    );
}

function parseRole(value: string | null): UserRoleLevel | null {
    if (value === UserRoleLevel.ADMIN || value === UserRoleLevel.COMMON) {
        return value;
    }
    return null;
}

function profileToRole(profile: UserDTO): UserRoleLevel {
    return profile.type === UserType.ADMIN
        ? UserRoleLevel.ADMIN
        : UserRoleLevel.COMMON;
}

function validateCommonProfile(
    uid: string,
    requestRole: UserRoleLevel,
    requestUserId: string
): Response | null {
    if (requestRole !== UserRoleLevel.COMMON) {
        return forbidden("AUTH_REQUEST_PANEL_FORBIDDEN");
    }
    if (requestUserId !== uid) {
        return forbidden("AUTH_REQUEST_IMPERSONATION_FORBIDDEN");
    }
    return null;
}

async function validateAdminProfile(
    uid: string,
    requestRole: UserRoleLevel,
    requestUserId: string
): Promise<Response | null> {
    if (requestRole === UserRoleLevel.ADMIN) {
        if (requestUserId !== uid) {
            return forbidden("AUTH_REQUEST_ADMIN_TARGET_INVALID");
        }
        return null;
    }
    if (requestRole === UserRoleLevel.COMMON) {
        if (requestUserId === uid) {
            return forbidden("AUTH_REQUEST_IMPERSONATION_REQUIRED");
        }
        const target = await userRepository.findByReferenceId(requestUserId);
        if (!target || target.type !== UserType.COMMON) {
            return forbidden("AUTH_REQUEST_IMPERSONATION_TARGET_INVALID");
        }
        return null;
    }
    return forbidden("AUTH_REQUEST_PANEL_FORBIDDEN");
}

/**
 * Validates optional auth-context headers against the verified Firebase user and DB profile.
 */
export async function resolveAuthRequestContext(
    req: NextRequest,
    userRecord: UserRecord,
    profile: UserDTO
): Promise<
    | { ok: true; data: ResolvedAuthRequestContext }
    | { ok: false; response: Response }
> {
    const uid = userRecord.uid;
    const roleFromProfile = profileToRole(profile);

    const headerUserId = req.headers.get(AUTH_REQUEST_HEADER.USER_ID);
    const headerRequestUserId = req.headers.get(
        AUTH_REQUEST_HEADER.REQUEST_USER_ID
    );
    const headerUserRole = req.headers.get(AUTH_REQUEST_HEADER.USER_ROLE);
    const headerRequestRole = req.headers.get(AUTH_REQUEST_HEADER.REQUEST_ROLE);
    const legacyXRole = req.headers.get("x-role");

    const userId = headerUserId ?? uid;
    if (userId !== uid) {
        return {
            ok: false,
            response: forbidden("AUTH_REQUEST_USER_ID_MISMATCH"),
        };
    }

    const userRole = parseRole(headerUserRole) ?? roleFromProfile;
    if (userRole !== roleFromProfile) {
        return {
            ok: false,
            response: forbidden("AUTH_REQUEST_USER_ROLE_MISMATCH"),
        };
    }

    const requestRole =
        parseRole(headerRequestRole) ?? parseRole(legacyXRole) ?? userRole;

    const requestUserId = headerRequestUserId ?? uid;

    const profileError =
        profile.type === UserType.COMMON
            ? validateCommonProfile(uid, requestRole, requestUserId)
            : await validateAdminProfile(uid, requestRole, requestUserId);

    if (profileError) {
        return { ok: false, response: profileError };
    }

    return {
        ok: true,
        data: {
            userId,
            requestUserId,
            userRole,
            requestRole,
            isImpersonating: requestUserId !== uid,
        },
    };
}
