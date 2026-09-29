import { getAuthInstance } from "@repo/auth/server";
import { isEmailEnabled } from "@repo/email";
import type { Locale } from "@repo/internationalization/utils";
import { logEvent } from "@repo/shared/utils/helpers/log";
import { env } from "@/env";

export type AuthActionKind = "reset-password" | "verify-email" | "change-email";

const APP_PATH_BY_KIND: Record<AuthActionKind, string> = {
    "reset-password": "reset-password",
    "verify-email": "verify-email",
    "change-email": "verify-email",
};

/** The page behind `verify-email` serves two actions and tells them apart by `mode`. */
const APP_MODE_BY_KIND: Partial<Record<AuthActionKind, string>> = {
    "change-email": "verifyAndChangeEmail",
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
    logEvent("auth-action-link", "refused", { kind, code });
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

    return toAppLink(kind, firebaseLink, locale);
}

function toAppLink(
    kind: AuthActionKind,
    firebaseLink: string,
    locale: Locale
): string | null {
    const oobCode = new URL(firebaseLink).searchParams.get("oobCode");
    if (!oobCode) {
        return null;
    }

    const base = env.NEXT_PUBLIC_APP_URL;
    if (!base) {
        return null;
    }

    const path = APP_PATH_BY_KIND[kind];
    const link = `${base}/${locale}/${path}?oobCode=${encodeURIComponent(oobCode)}`;
    const mode = APP_MODE_BY_KIND[kind];
    return mode ? `${link}&mode=${mode}` : link;
}

export type EmailChangeLinkResult =
    | { ok: true; url: string }
    | { ok: false; reason: "email-in-use" | "refused" };

/**
 * Mints the link that moves `currentEmail` to `newEmail` once opened. Unlike the
 * anonymous flows above, the caller is the signed-in owner of `currentEmail`, so an
 * address already taken can be reported as such.
 */
export async function buildEmailChangeLink(
    currentEmail: string,
    newEmail: string,
    locale: Locale
): Promise<EmailChangeLinkResult> {
    const auth = getAuthInstance();

    // Checked here rather than left to the generator: the emulator refuses a taken
    // address, but nothing documents that the production generator does the same.
    try {
        await auth.getUserByEmail(newEmail);
        return { ok: false, reason: "email-in-use" };
    } catch (error) {
        if (firebaseErrorCode(error) !== "auth/user-not-found") {
            throw error;
        }
    }

    let firebaseLink: string;
    try {
        firebaseLink = await auth.generateVerifyAndChangeEmailLink(
            currentEmail,
            newEmail
        );
    } catch (error) {
        const code = firebaseErrorCode(error);
        if (code === "auth/email-already-exists") {
            return { ok: false, reason: "email-in-use" };
        }
        if (code) {
            logRefusedLink("change-email", code);
            return { ok: false, reason: "refused" };
        }
        throw error;
    }

    const url = toAppLink("change-email", firebaseLink, locale);
    return url ? { ok: true, url } : { ok: false, reason: "refused" };
}
