import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";

/**
 * Maps Firebase Identity Toolkit / REST error messages to stable API error codes
 * for client-side dictionary lookup.
 */
export function mapIdentityToolkitMessageToCode(message: string): string {
    const m = message.toUpperCase();
    if (m.includes("EMAIL_EXISTS")) {
        return "USERS_AUTH_EMAIL_ALREADY_IN_USE";
    }
    if (m.includes("WEAK_PASSWORD")) {
        return "USERS_AUTH_WEAK_PASSWORD";
    }
    if (m.includes("INVALID_EMAIL")) {
        return "USERS_AUTH_INVALID_EMAIL";
    }
    if (m.includes("TOO_MANY_ATTEMPTS") || m.includes("TOO_MANY_REQUESTS")) {
        return "USERS_AUTH_RATE_LIMITED";
    }
    return "USERS_AUTH_SIGN_UP_FAILED";
}

/**
 * Maps an action-code failure to a stable code. The caller supplies the fallback
 * because the same toolkit message set serves both password reset and email
 * verification.
 */
export function mapOobActionMessageToCode(
    message: string,
    fallback: string
): string {
    const m = message.toUpperCase();
    if (m.includes("EXPIRED_OOB_CODE")) {
        return "AUTH_OOB_CODE_EXPIRED";
    }
    if (m.includes("INVALID_OOB_CODE")) {
        return "AUTH_OOB_CODE_INVALID";
    }
    if (m.includes("WEAK_PASSWORD")) {
        return "USERS_AUTH_WEAK_PASSWORD";
    }
    if (m.includes("TOO_MANY_ATTEMPTS") || m.includes("TOO_MANY_REQUESTS")) {
        return "USERS_AUTH_RATE_LIMITED";
    }
    return fallback;
}

/**
 * Maps a re-authentication failure to a stable code. Every credential rejection collapses
 * into the caller's fallback because the toolkit deliberately does not distinguish a wrong
 * password from an unknown account.
 */
export function mapPasswordCheckMessageToCode(
    message: string,
    fallback: string
): string {
    const m = message.toUpperCase();
    if (m.includes("TOO_MANY_ATTEMPTS") || m.includes("TOO_MANY_REQUESTS")) {
        return "USERS_AUTH_RATE_LIMITED";
    }
    if (m.includes("WEAK_PASSWORD")) {
        return "USERS_AUTH_WEAK_PASSWORD";
    }
    return fallback;
}

const ADMIN_CREATE_USER_ERROR_CODES: Record<string, string> = {
    "auth/email-already-exists": "USERS_AUTH_EMAIL_ALREADY_IN_USE",
    "auth/invalid-email": "USERS_AUTH_INVALID_EMAIL",
    "auth/invalid-password": "USERS_AUTH_WEAK_PASSWORD",
    "auth/quota-exceeded": "USERS_AUTH_RATE_LIMITED",
};

function adminErrorCodeOf(error: unknown): string | undefined {
    const code = (error as { code?: unknown } | null)?.code;
    return typeof code === "string" ? code : undefined;
}

/**
 * Maps an Admin SDK `createUser` rejection to a stable code, or `null` when the failure
 * is not something the caller can fix (the route answers it as a server error).
 */
export function mapAdminCreateUserErrorToCode(error: unknown): string | null {
    const code = adminErrorCodeOf(error);
    return code ? (ADMIN_CREATE_USER_ERROR_CODES[code] ?? null) : null;
}

/**
 * What a log line may say about an Admin SDK failure: the provider code
 * (`auth/internal-error`) or the error name. Never the message, which can echo the address.
 */
export function adminAuthErrorReason(error: unknown): string {
    return (
        adminErrorCodeOf(error) ??
        (error instanceof Error ? error.name : "unknown")
    );
}

export function statusForAuthErrorCode(code: string): number {
    return code === "USERS_AUTH_RATE_LIMITED"
        ? HTTP_STATUS.TOO_MANY_REQUESTS
        : HTTP_STATUS.BAD_REQUEST;
}
