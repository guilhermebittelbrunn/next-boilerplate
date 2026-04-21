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
    userId: string | undefined;
    requestUserId: string | undefined;
    userRole: UserRoleLevel | undefined;
    requestRole: UserRoleLevel | undefined;
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
