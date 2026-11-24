import { arcjetKeyState } from "@repo/security/keys";
import { reportRequestError } from "@repo/shared/utils/helpers/requestErrorReporter";
import type { Instrumentation } from "next";
import { parseAllowedOrigins } from "@/(shared)/lib/cors";

/**
 * One Stripe key without the other leaves billing switched off, which is safe but easy to
 * miss: the panel quietly shows the placeholder. Said once, at boot, naming what is missing.
 */
function warnOnHalfConfiguredPayments(): void {
    const hasSecretKey = Boolean(process.env.STRIPE_SECRET_KEY);
    const hasWebhookSecret = Boolean(process.env.STRIPE_WEBHOOK_SECRET);

    if (hasSecretKey === hasWebhookSecret) {
        return;
    }

    const missing = hasSecretKey
        ? "STRIPE_WEBHOOK_SECRET"
        : "STRIPE_SECRET_KEY";
    console.warn(
        `[payments] billing is DISABLED (no ${missing}). Set both Stripe keys or neither.`
    );
}

/**
 * A key without the Arcjet prefix is read as no key, so the limiter stays off rather than
 * failing every request. That is a configuration mistake, not a choice, hence an error. The
 * value is never logged: whatever was pasted there may be another service's credential.
 */
function warnOnDisabledRateLimit(): void {
    const state = arcjetKeyState(process.env.ARCJET_KEY);

    if (state === "absent") {
        console.warn(
            "[security] rate limiting is DISABLED (no ARCJET_KEY). Mutating routes accept unlimited requests."
        );
        return;
    }

    if (state === "malformed") {
        console.error(
            '[security] rate limiting is DISABLED (ARCJET_KEY is set but does not start with "ajkey_"). Mutating routes accept unlimited requests.'
        );
    }
}

/**
 * Firestore is this API's database and it is reached with a service account, so a missing
 * credential is a configuration error, not a runtime state to degrade into. `env.ts` cannot
 * cover this: it skips validation in development and is only evaluated by the modules that
 * import it.
 *
 * The same reasoning governs `CORS_ORIGIN`: a build must not demand a production value, but
 * a production process must not start without one — otherwise it accepts no browser at all
 * and the failure surfaces one request at a time. An empty or comma-only list counts as
 * missing, because the proxy would read it as an empty allowlist.
 */
async function prepareServer(): Promise<void> {
    if (
        process.env.NODE_ENV === "production" &&
        parseAllowedOrigins(process.env.CORS_ORIGIN).length === 0
    ) {
        throw new Error(
            "CORS_ORIGIN is required in production: set the comma-separated list of origins allowed to call this API."
        );
    }

    warnOnDisabledRateLimit();
    warnOnHalfConfiguredPayments();

    const { getFirestoreAdmin } = await import("@repo/auth/server");
    getFirestoreAdmin();
}

export const register = async () => {
    if (process.env.NEXT_RUNTIME === "nodejs") {
        const { bootOrExit } = await import("./instrumentation-node");
        await bootOrExit(prepareServer);
    }
};

export const onRequestError: Instrumentation.onRequestError =
    reportRequestError;
