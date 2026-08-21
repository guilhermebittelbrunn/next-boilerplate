/** biome-ignore-all lint/style/noEnum: enums for role */
export enum UserType {
    ADMIN = "admin",
    COMMON = "common",
}

export type UserDTO = {
    id: string;
    type: UserType;
    reference_id: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
};

export type AdminCreateUserRequest = {
    email: string;
    password: string;
    type: UserType;
    displayName?: string;
};

export type AdminUpdateUserRequest = {
    id: string;
    type?: UserType;
    displayName?: string | null;
    disabled?: boolean;
};

export type UserWithAuthDTO = UserDTO & {
    uid: string;
    email: string | null;
    emailVerified: boolean;
    displayName: string | null;
    photoURL: string | null;
    phoneNumber: string | null;
    disabled: boolean;
    metadata: {
        creationTime: string;
        lastSignInTime: string;
        lastRefreshTime?: string | null;
    };
    providerData: Array<{
        providerId: string;
        uid: string;
        displayName: string | null;
        email: string | null;
        phoneNumber: string | null;
    }>;
    customClaims: Record<string, unknown> | null;
    tokensValidAfterTime?: string;
};
