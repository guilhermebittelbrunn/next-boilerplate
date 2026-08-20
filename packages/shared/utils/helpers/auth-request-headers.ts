/** HTTP headers for authenticated request context (SDK ↔ API). */
export const AUTH_REQUEST_HEADER = {
    USER_ID: "x-user-id",
    REQUEST_USER_ID: "x-request-user-id",
    USER_ROLE: "x-user-role",
    REQUEST_ROLE: "x-request-role",
    USER_TIMEZONE: "x-user-timezone",
} as const;

/**
 * IANA time zone of the caller (e.g. `America/Sao_Paulo`), for formatting and
 * auditing dates on the server. Untrusted input: validate before use and never
 * let it influence an authorization decision.
 */
export function isValidIanaTimeZone(value: string | null | undefined): boolean {
    if (!value) {
        return false;
    }
    try {
        new Intl.DateTimeFormat(undefined, { timeZone: value });
        return true;
    } catch {
        return false;
    }
}

/** The browser's IANA time zone, or `undefined` when unavailable. */
export function resolveBrowserTimeZone(): string | undefined {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
    } catch {
        return;
    }
}
