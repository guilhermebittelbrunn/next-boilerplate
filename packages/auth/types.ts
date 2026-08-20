/** biome-ignore-all lint/style/noEnum: enums for role */
import type { User } from "firebase/auth";

export enum UserRoleLevel {
    ADMIN = "admin",
    COMMON = "common",
}

/**
 * Cross-cutting auth context for API requests (authenticated user vs effective panel).
 * Sent as headers by the SDK and validated on the API.
 */
export type IAuthContextProps = {
    /** The authenticated actor. Cross-checked against the token's uid on the API. */
    userId: string | undefined;
    /** The user whose data the request targets — differs from `userId` under impersonation. */
    requestUserId: string | undefined;
    /** The actor's real role, from their persisted profile. */
    userRole: UserRoleLevel | undefined;
    /** The effective panel the actor is operating in. */
    requestRole: UserRoleLevel | undefined;
    /** IANA time zone of the caller, for date formatting/auditing. Never used for authorization. */
    userTimezone: string | undefined;
};

/** Whether the UI should offer switching to a subordinate panel (e.g. admin → common). */
export function canSwitchPanelEnvironment(role: UserRoleLevel): boolean {
    return role === UserRoleLevel.ADMIN;
}

/** Firestore-backed profile from `/api/users/me`. */
export type UserProfile = {
    id: string;
    uid: string;
    email: string | null;
    role: UserRoleLevel;
    createdAt: string;
    updatedAt: string;
};

export type UserDTO = User;

export type SignInDTO = {
    email: string;
    password: string;
};

export type SignUpDTO = {
    email: string;
    password: string;
};

export function parseUserProfileResponse(data: unknown): UserProfile | null {
    if (!data || typeof data !== "object") {
        return null;
    }
    const o = data as Record<string, unknown>;
    if (typeof o.uid !== "string") {
        return null;
    }
    if (o.role !== UserRoleLevel.ADMIN && o.role !== UserRoleLevel.COMMON) {
        return null;
    }
    if (typeof o.createdAt !== "string" || typeof o.updatedAt !== "string") {
        return null;
    }

    return {
        id: o.uid,
        uid: o.uid,
        email: typeof o.email === "string" ? o.email : null,
        role: o.role,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
    };
}
