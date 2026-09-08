/**
 * Firestore is this API's database and it is reached with a service account, so a missing
 * credential is a configuration error, not a runtime state to degrade into. Resolving the
 * instance here turns it into a startup crash with a clear message instead of every request
 * failing later. `env.ts` cannot cover this: it skips validation in development and is only
 * evaluated by the modules that import it.
 *
 * The same reasoning governs `CORS_ORIGIN`: a build must not demand a production value, but
 * a production process must not start without one — otherwise it accepts no browser at all
 * and the failure surfaces one request at a time.
 */
export const register = async () => {
    if (process.env.NEXT_RUNTIME !== "nodejs") {
        return;
    }

    if (process.env.NODE_ENV === "production" && !process.env.CORS_ORIGIN) {
        throw new Error(
            "CORS_ORIGIN is required in production: set the comma-separated list of origins allowed to call this API."
        );
    }

    if (!process.env.ARCJET_KEY) {
        console.warn(
            "[security] rate limiting is DISABLED (no ARCJET_KEY). Public auth routes accept unlimited requests."
        );
    }

    const { getFirestoreAdmin } = await import("@repo/auth/server");
    getFirestoreAdmin();
};
