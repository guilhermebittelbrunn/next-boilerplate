import type { EntityDTO } from "../entity/entity";
import type { SubscriptionStateDTO } from "../payments/payments";
import type { UserPreferences, UserWithAuthDTO } from "../user/user";

export type AccountDTO = Omit<UserWithAuthDTO, "subscription"> & {
    phone: string | null;
    avatar: string | null;
    avatarUrl: string | null;
    preferences: UserPreferences;
    subscription?: SubscriptionStateDTO | null;
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

export type ChangeEmailRequest = {
    newEmail: string;
    currentPassword: string;
    /** Language of both emails. Absent falls back to the fork's default locale. */
    locale?: string;
};

/** The address only changes when the link sent to the new one is opened. */
export type AccountEmailChangeRequested = { requested: true };

export type AccountConfirmation = {
    confirmed: boolean;
};

export type AccountDataExportRecord = {
    action: string;
    /** Who acted, without naming anyone else: the data subject, or an operator. */
    actorRole: "self" | "operator";
    createdAt: string;
    requestId: string | null;
};

/**
 * Everything the product holds about the data subject, in one machine-readable payload.
 * `avatarUrl` is left out: it is a signed URL that expires in 15 minutes, so it would be
 * dead in a saved file and an open link while it lived.
 */
export type AccountDataExportDTO = {
    generatedAt: string;
    format: { name: "account-data-export"; version: 1 };
    subject: { profileId: string; uid: string };
    account: Omit<AccountDTO, "avatarUrl">;
    records: { entities: EntityDTO[]; truncated: boolean };
    auditEvents: { items: AccountDataExportRecord[]; truncated: boolean };
    storageObjects: { path: string }[];
};

export type DeleteAccountRequest = {
    currentPassword: string;
};
