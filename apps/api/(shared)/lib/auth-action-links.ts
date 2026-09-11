import { getAuthInstance } from "@repo/auth/server";
import { isEmailEnabled } from "@repo/email";
import type { Locale } from "@repo/internationalization/utils";
import { env } from "@/env";

export type AuthActionKind = "reset-password" | "verify-email";

const APP_PATH_BY_KIND: Record<AuthActionKind, string> = {
    "reset-password": "reset-password",
    "verify-email": "verify-email",
};

/** Both prerequisites of a working link, checked before any account lookup. */
export function canSendAuthActionLink(): boolean {
    return isEmailEnabled() && Boolean(env.NEXT_PUBLIC_APP_URL);
}

function firebaseErrorCode(error: unknown): string | null {
    const code = (error as { code?: unknown } | null)?.code;
    return typeof code === "string" ? code : null;
}

/** One line, stable prefix, no address: a refused link is no reason to log personal data. */
function logRefusedLink(kind: AuthActionKind, code: string): void {
    console.warn(`[auth-action-link] refused kind=${kind} code=${code}`);
}

/**
 * The Admin SDK hands back a URL pointing at Firebase's own hosted handler, which
 * neither translates nor carries the brand. Only the single-use code inside it is
 * kept, and the link is rebuilt against this project's own page — so a fork gets a
 * working flow without configuring an action URL in the Firebase console.
 *
 * Answers `null` for an address with no account: the caller must not be able to
 * tell that case apart from a delivered email.
 */
export async function buildAuthActionLink(
    kind: AuthActionKind,
    email: string,
    locale: Locale
): Promise<string | null> {
    const auth = getAuthInstance();

    // Resolved up front because the link generators below report an unknown address
    // as an internal assertion rather than as a missing account, while this lookup
    // answers with the documented `auth/user-not-found`.
    try {
        await auth.getUserByEmail(email);
    } catch (error) {
        const code = firebaseErrorCode(error);
        if (code === "auth/user-not-found" || code === "auth/invalid-email") {
            return null;
        }
        throw error;
    }

    let firebaseLink: string;
    try {
        firebaseLink =
            kind === "reset-password"
                ? await auth.generatePasswordResetLink(email)
                : await auth.generateEmailVerificationLink(email);
    } catch (error) {
        const code = firebaseErrorCode(error);
        // Anything the generator refuses is answered as "no link", never as a fault:
        // a 500 here would tell an anonymous caller that this address is special.
        if (code) {
            logRefusedLink(kind, code);
            return null;
        }
        throw error;
    }

    const oobCode = new URL(firebaseLink).searchParams.get("oobCode");
    if (!oobCode) {
        return null;
    }

    const base = env.NEXT_PUBLIC_APP_URL;
    if (!base) {
        return null;
    }

    const path = APP_PATH_BY_KIND[kind];
    return `${base}/${locale}/${path}?oobCode=${encodeURIComponent(oobCode)}`;
}
