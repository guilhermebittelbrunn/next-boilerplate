"use client";

import { getCookie, setCookie } from "@repo/shared/utils";

const PREFERENCE_COOKIE_TTL_DAYS = 180;
const SECONDS_IN_A_DAY = 60 * 60 * 24;
export const PREFERENCE_COOKIE_TTL_SECONDS =
    PREFERENCE_COOKIE_TTL_DAYS * SECONDS_IN_A_DAY;

const THEME_COOKIE = "x-theme";

/**
 * Storage key `next-themes` reads. It only holds a value once the person picks a theme,
 * and that value always beats the provider default — which is why it is the signal for
 * "this browser has a choice of its own".
 */
const THEME_STORAGE_KEY = "theme";

function chosenTheme(): string | null {
    return window.localStorage.getItem(THEME_STORAGE_KEY);
}

/**
 * The theme has two homes: this browser, where `next-themes` keeps it, and the cookie the
 * server reads to pick the first paint. Writing one without the other is what makes a page
 * paint one theme and then swap to the other.
 */
export function storeActiveTheme(theme: string): void {
    if (typeof window === "undefined") {
        return;
    }
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    setCookie(THEME_COOKIE, theme, PREFERENCE_COOKIE_TTL_SECONDS);
}

/**
 * A theme picked in this browser rules here until it is changed here or on the account
 * screen, so signing in only seeds browsers with no choice of their own — that is what
 * carries the account preference to a new device without undoing a local one.
 */
export function seedThemeIfUnset(theme: string): void {
    if (typeof window === "undefined" || chosenTheme()) {
        return;
    }
    storeActiveTheme(theme);
}

/**
 * Mirrors a choice made in this browser into the cookie. A browser that never picked one
 * is left alone on purpose: writing the resolved default here would forge a choice and
 * block the account preference from ever reaching this device.
 */
export function syncThemeCookieWithChoice(
    activeTheme: string | undefined
): void {
    if (typeof window === "undefined" || !activeTheme) {
        return;
    }
    if (chosenTheme() && getCookie(THEME_COOKIE) !== activeTheme) {
        setCookie(THEME_COOKIE, activeTheme, PREFERENCE_COOKIE_TTL_SECONDS);
    }
}
