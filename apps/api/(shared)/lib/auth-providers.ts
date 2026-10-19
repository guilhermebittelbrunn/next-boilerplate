import type { UserRecord } from "firebase-admin/auth";

/** Firebase's provider id for e-mail and password sign-in. */
export const PASSWORD_PROVIDER_ID = "password";
export const GOOGLE_PROVIDER_ID = "google.com";

export function hasProvider(user: UserRecord, providerId: string): boolean {
    return user.providerData.some(
        (provider) => provider.providerId === providerId
    );
}

/**
 * An account signed up through Google alone has no password to re-enter, so a flow that
 * proves identity with one has nothing to ask for.
 */
export function hasPasswordProvider(user: UserRecord): boolean {
    return hasProvider(user, PASSWORD_PROVIDER_ID);
}
