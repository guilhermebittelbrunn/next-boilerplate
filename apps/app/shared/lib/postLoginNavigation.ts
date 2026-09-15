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
 * The theme is read on the server to pick the first paint and has no other home in the
 * URL, so signing in is what carries it to this device. A cookie cannot be written while
 * a Server Component renders, which is why this does not happen per page.
 */
function projectThemePreference(raw: unknown): void {
    if (!raw || typeof raw !== "object") {
        return;
    }
    const preferences = raw as StoredPreferences;

    if (
        typeof preferences.theme === "string" &&
        themeValues.includes(preferences.theme)
    ) {
        seedThemeIfUnset(preferences.theme);
    }
}

function readPreferredLocale(raw: unknown): string | null {
    if (!raw || typeof raw !== "object") {
        return null;
    }
    const { locale } = raw as StoredPreferences;

    return typeof locale === "string" && localeValues.includes(locale)
        ? locale
        : null;
}

/**
 * The language also lives in the path, and the proxy rewrites the cookie from it on every
 * request — so the cookie is only worth writing when the destination is about to follow
 * the account, never when an explicit destination already pins another language.
 */
function writePreferredLocale(locale: string): void {
    setCookie("x-locale", locale, PREFERENCE_COOKIE_TTL_SECONDS);
}

type SignedInAccount = { type?: string; preferredLocale: string | null };

/**
 * Carrying the account preferences to this device is a consequence of signing in, not of
 * where the sign-in happens to land — so it runs on its own, before any destination is
 * decided.
 */
export async function applyAccountPreferences(
    idToken: string
): Promise<SignedInAccount | null> {
    apiClient.setAuthorizationHeader(idToken);

    try {
        const me = await apiClient.authApi.me();
        projectThemePreference(me.preferences);
        return {
            type: me.type,
            preferredLocale: readPreferredLocale(me.preferences),
        };
    } catch {
        return null;
    }
}

function destinationForAccount(
    account: SignedInAccount | null,
    locale: string
): string | null {
    if (!account) {
        return null;
    }

    if (account.preferredLocale) {
        writePreferredLocale(account.preferredLocale);
    }

    if (account.type === UserType.ADMIN) {
        return `/${account.preferredLocale ?? locale}/admin`;
    }

    return account.preferredLocale && account.preferredLocale !== locale
        ? `/${account.preferredLocale}`
        : null;
}

/**
 * When there is no `redirect` query, admins default to `/{locale}/admin` so the first screen matches the panel toggle.
 */
export async function resolveDefaultPostLoginForApp(args: {
    idToken: string;
    locale: string;
}): Promise<string | null> {
    const account = await applyAccountPreferences(args.idToken);
    return destinationForAccount(account, args.locale);
}

export async function resolveAppPostLoginPath(args: {
    idToken: string;
    locale: string;
    fallbackPath: string;
}): Promise<string> {
    if (typeof window === "undefined") {
        return args.fallbackPath;
    }

    const account = await applyAccountPreferences(args.idToken);
    const raw = new URLSearchParams(window.location.search).get("redirect");

    if (raw) {
        return postAuthRedirectTarget(raw, args.fallbackPath);
    }

    return destinationForAccount(account, args.locale) ?? args.fallbackPath;
}
