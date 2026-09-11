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

export function statusForAuthErrorCode(code: string): number {
    return code === "USERS_AUTH_RATE_LIMITED"
        ? HTTP_STATUS.TOO_MANY_REQUESTS
        : HTTP_STATUS.BAD_REQUEST;
}
