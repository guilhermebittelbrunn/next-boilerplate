import type { AccountDTO, UserPreferences } from "@repo/sdk/src/types";
import { logEvent } from "@repo/shared/utils/helpers/log";
import { isAbsoluteHttpUrl } from "./entity-photo";
import {
    isStorageConfigured,
    isStorageObjectPath,
    signReadUrl,
} from "./storage";

const DEFAULT_PREFERENCES: UserPreferences = {
    theme: "system",
    locale: "pt-br",
};

export function resolvePreferences(raw: unknown): UserPreferences {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        return { ...DEFAULT_PREFERENCES };
    }
    const stored = raw as Partial<UserPreferences>;
    return {
        theme: stored.theme ?? DEFAULT_PREFERENCES.theme,
        locale: stored.locale ?? DEFAULT_PREFERENCES.locale,
    };
}

async function resolveAvatarUrl(avatar: string | null): Promise<string | null> {
    if (!avatar) {
        return null;
    }

    if (isAbsoluteHttpUrl(avatar)) {
        return avatar;
    }

    if (!(isStorageConfigured() && isStorageObjectPath(avatar))) {
        return null;
    }

    try {
        const { url } = await signReadUrl(avatar);
        return url;
    } catch {
        // A bucket that refuses to sign costs the caller a picture, not the account:
        // the panel falls back to the initials avatar.
        logEvent("storage", "sign-url-failed", { resource: "avatar" });
        return null;
    }
}

/**
 * `avatarUrl` only ever exists on the way out — the document keeps the reference, so an
 * expiring signature can never be written back by an update.
 */
export async function withAvatarUrl(
    merged: Record<string, unknown>
): Promise<AccountDTO> {
    const avatar =
        typeof merged.avatar === "string" && merged.avatar
            ? merged.avatar
            : null;
    const phone =
        typeof merged.phone === "string" && merged.phone ? merged.phone : null;

    return {
        ...(merged as unknown as AccountDTO),
        phone,
        avatar,
        avatarUrl: await resolveAvatarUrl(avatar),
        preferences: resolvePreferences(merged.preferences),
    };
}
