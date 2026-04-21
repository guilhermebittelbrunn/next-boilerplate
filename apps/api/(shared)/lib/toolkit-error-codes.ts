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
