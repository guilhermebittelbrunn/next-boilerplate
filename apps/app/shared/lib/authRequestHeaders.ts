import { type IAuthContextProps, UserRoleLevel } from "@repo/auth/types";
import { UserType } from "@repo/sdk/src/types";

export type ProfileKind = "admin" | "common";

/** Storage + cookie keys shared between the client store and server prefetch. */
export const PANEL_ROLE_COOKIE = "bp:panel-request-role";
export const IMPERSONATE_UID_COOKIE = "bp:impersonate-firebase-uid";

export function mapMeTypeToProfileKind(type?: string): ProfileKind {
    return type === UserType.ADMIN ? "admin" : "common";
}

export type DeriveAuthRequestArgs = {
    uid: string;
    profileKind: ProfileKind;
    panelRole: UserRoleLevel;
    impersonatedUid: string | null;
};

export type DerivedAuthRequest = {
    props: IAuthContextProps;
    context: "common" | "admin";
};

/**
 * Pure mapping from (session + panel) state to the SDK auth-request context.
 *
 * Shared by the client store (applies headers on the singleton `apiClient`) and
 * the server prefetch client (applies headers per request), so client and server
 * always resolve the same effective user. Keeping it pure makes the impersonation
 * rules trivially testable.
 */
export function deriveAuthRequestProps(
    args: DeriveAuthRequestArgs
): DerivedAuthRequest {
    const { uid, profileKind, panelRole, impersonatedUid } = args;

    if (profileKind === "common") {
        return {
            props: {
                userId: uid,
                requestUserId: uid,
                userRole: UserRoleLevel.COMMON,
                requestRole: UserRoleLevel.COMMON,
            },
            context: "common",
        };
    }

    // Admin acting as a common user (impersonation).
    if (panelRole === UserRoleLevel.COMMON && impersonatedUid) {
        return {
            props: {
                userId: uid,
                requestUserId: impersonatedUid,
                userRole: UserRoleLevel.ADMIN,
                requestRole: UserRoleLevel.COMMON,
            },
            context: "common",
        };
    }

    return {
        props: {
            userId: uid,
            requestUserId: uid,
            userRole: UserRoleLevel.ADMIN,
            requestRole: UserRoleLevel.ADMIN,
        },
        context: "admin",
    };
}
