"use client";

import { postAuthRedirectTarget } from "@repo/auth/redirect";
import { UserType } from "@repo/sdk/src/types";
import { setCookie } from "@repo/shared/utils";
import { apiClient } from "@/shared/lib/client";
import {
    PREFERENCE_COOKIE_TTL_SECONDS,
    seedThemeIfUnset,
} from "@/shared/lib/themePreference";

const themeValues = ["light", "dark", "system"];
const localeValues = ["pt-br", "en", "es"];

type StoredPreferences = { theme?: unknown; locale?: unknown };

/**
 * Theme and language live on the account, but both are read on the server to pick the
 * first paint — so sign-in is where they are projected into cookies. A cookie cannot be
 * written while a Server Component renders, which is why this does not happen per page.
 */
function projectPreferences(raw: unknown): string | null {
    if (!raw || typeof raw !== "object") {
        return null;
    }
    const preferences = raw as StoredPreferences;

    if (
        typeof preferences.theme === "string" &&
        themeValues.includes(preferences.theme)
    ) {
        seedThemeIfUnset(preferences.theme);
    }

    if (
        typeof preferences.locale === "string" &&
        localeValues.includes(preferences.locale)
    ) {
        setCookie(
            "x-locale",
            preferences.locale,
            PREFERENCE_COOKIE_TTL_SECONDS
        );
        return preferences.locale;
    }

    return null;
}

/**
 * When there is no `redirect` query, admins default to `/{locale}/admin` so the first screen matches the panel toggle.
 */
export async function resolveDefaultPostLoginForApp(args: {
    idToken: string;
    locale: string;
}): Promise<string | null> {
    apiClient.setAuthorizationHeader(args.idToken);

    let type: string | undefined;
    let preferredLocale: string | null = null;
    try {
        const me = await apiClient.authApi.me();
        type = me.type;
        preferredLocale = projectPreferences(me.preferences);
    } catch {
        return null;
    }

    const locale = preferredLocale ?? args.locale;

    if (type === UserType.ADMIN) {
        return `/${locale}/admin`;
    }

    return preferredLocale && preferredLocale !== args.locale
        ? `/${preferredLocale}`
        : null;
}

export async function resolveAppPostLoginPath(args: {
    idToken: string;
    locale: string;
    fallbackPath: string;
}): Promise<string> {
    if (typeof window === "undefined") {
        return args.fallbackPath;
    }
    const raw = new URLSearchParams(window.location.search).get("redirect");
    if (raw) {
        return postAuthRedirectTarget(raw, args.fallbackPath);
    }
    return (
        (await resolveDefaultPostLoginForApp({
            idToken: args.idToken,
            locale: args.locale,
        })) ?? args.fallbackPath
    );
}
