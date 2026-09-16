/**
 * Scopes are a closed list so a log line can be grepped by subsystem months later,
 * and so a new call site has to declare where it belongs instead of inventing a prefix.
 */
export type LogScope =
    | "account"
    | "auth"
    | "auth-action-link"
    | "email"
    | "payments"
    | "request"
    | "security"
    | "storage";

/**
 * Objects are deliberately absent: an `Error` cannot be passed through this signature,
 * and an error from a known code path carries personal data (an address, a token, a
 * body echoed back by a provider) that must never reach the log.
 */
export type LogFieldValue = string | number | boolean | null | undefined;

export type LogFields = Record<string, LogFieldValue>;

const LINE_BREAKING_CHARACTERS = /[\s]+/g;

function sanitizeValue(value: string | number | boolean): string {
    return String(value).replace(LINE_BREAKING_CHARACTERS, "_");
}

function formatFields(fields: LogFields | undefined): string {
    if (!fields) {
        return "";
    }

    let formatted = "";
    for (const [key, value] of Object.entries(fields)) {
        if (value === undefined || value === null) {
            continue;
        }
        formatted += ` ${key}=${sanitizeValue(value)}`;
    }

    return formatted;
}

/**
 * One line, stable prefix, `key=value` pairs only. Whitespace inside a value becomes
 * `_` so a path or a reason carrying a newline cannot forge a second log entry.
 */
export function logEvent(
    scope: LogScope,
    event: string,
    fields?: LogFields
): void {
    console.warn(`[${scope}] ${event}${formatFields(fields)}`);
}
