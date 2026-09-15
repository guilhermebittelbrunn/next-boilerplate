import type { UserPreferences, UserWithAuthDTO } from "../user/user";

export type AccountDTO = UserWithAuthDTO & {
    phone: string | null;
    avatar: string | null;
    avatarUrl: string | null;
    preferences: UserPreferences;
};

export type UpdateAccountRequest = {
    displayName?: string | null;
    phone?: string | null;
    avatar?: string | null;
    preferences?: Partial<UserPreferences>;
};

export type ChangePasswordRequest = {
    currentPassword: string;
    password: string;
};

export type AccountConfirmation = {
    confirmed: boolean;
};
