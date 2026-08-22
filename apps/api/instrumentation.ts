/**
 * Firestore is this API's database and it is reached with a service account, so a missing
 * credential is a configuration error, not a runtime state to degrade into. Resolving the
 * instance here turns it into a startup crash with a clear message instead of every request
 * failing later. `env.ts` cannot cover this: it skips validation in development and is only
 * evaluated by the modules that import it.
 */
export const register = async () => {
    if (process.env.NEXT_RUNTIME !== "nodejs") {
        return;
    }

    const { getFirestoreAdmin } = await import("@repo/auth/server");
    getFirestoreAdmin();
};
