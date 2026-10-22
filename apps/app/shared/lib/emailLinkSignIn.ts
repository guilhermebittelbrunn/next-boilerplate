const REMEMBERED_EMAIL_KEY = "email-link-sign-in:email";

export type EmailLinkFailure = "mismatch" | "expired" | "invalid" | "other";

// Storage can be missing or throw (private mode, blocked cookies); losing the remembered
// address only means the link page asks for it again.
export function rememberEmailForLink(email: string): void {
    try {
        window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
    } catch {
        // nothing to do: the completion page falls back to asking
    }
}

export function readRememberedEmail(): string | null {
    try {
        const email = window.localStorage.getItem(REMEMBERED_EMAIL_KEY);
        return email ? email : null;
    } catch {
        return null;
    }
}

export function forgetRememberedEmail(): void {
    try {
        window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    } catch {
        // nothing to do: a stale address only pre-selects a failing attempt
    }
}

const FAILURE_BY_FIREBASE_CODE: Record<string, EmailLinkFailure> = {
    "auth/invalid-email": "mismatch",
    "auth/expired-action-code": "expired",
    "auth/invalid-action-code": "invalid",
    "auth/argument-error": "invalid",
};

export function emailLinkFailureOf(error: unknown): EmailLinkFailure {
    const code = (error as { code?: unknown } | null)?.code;
    if (typeof code !== "string") {
        return "other";
    }
    return FAILURE_BY_FIREBASE_CODE[code] ?? "other";
}
