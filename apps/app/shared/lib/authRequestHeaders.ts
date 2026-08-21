import { type IAuthContextProps, UserRoleLevel } from "@repo/auth/types";
import { UserType } from "@repo/sdk/src/types";

export type ProfileKind = "admin" | "common";

/**
 * Least privilege: only an explicit admin type grants the admin panel; everything else
 * is common. Callers decide whether there is a session at all.
 */
export function mapMeTypeToProfileKind(type?: string): ProfileKind {
    return type === UserType.ADMIN ? "admin" : "common";
}

export type DeriveAuthRequestArgs = {
    uid: string;
    profileKind: ProfileKind;
    panelRole: UserRoleLevel;
    impersonatedUid: string | null;
    /** IANA time zone of the browser. Formatting/auditing only, never authorization. */
    timeZone?: string;
};

export type DerivedAuthRequest = {
    props: IAuthContextProps;
    context: "common" | "admin";
};

/**
 * Pure mapping from (session + panel) state to the SDK auth-request context.
 *
 * Shared by the client store (applies headers on the singleton `apiClient`) and the
 * server prefetch client, so client and server always resolve the same effective user.
 *
 * `userId` is always the **actor** (cross-checked against the token on the API);
 * `requestUserId` is the **subject** whose data is being read, which only differs from
 * the actor while an admin impersonates a common user.
 */
export function deriveAuthRequestProps(
    args: DeriveAuthRequestArgs
): DerivedAuthRequest {
    const { uid, profileKind, panelRole, impersonatedUid, timeZone } = args;

    if (profileKind === "common") {
        return {
            props: {
                userId: uid,
                requestUserId: uid,
                userRole: UserRoleLevel.COMMON,
                requestRole: UserRoleLevel.COMMON,
                userTimezone: timeZone,
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
                userTimezone: timeZone,
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
            userTimezone: timeZone,
        },
        context: "admin",
    };
}
