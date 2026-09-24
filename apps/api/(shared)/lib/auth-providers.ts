import type { UserRecord } from "firebase-admin/auth";

/** Firebase's provider id for e-mail and password sign-in. */
const PASSWORD_PROVIDER_ID = "password";

/**
 * An account signed up through Google alone has no password to re-enter, so a flow that
 * proves identity with one has nothing to ask for.
 */
export function hasPasswordProvider(user: UserRecord): boolean {
    return user.providerData.some(
        (provider) => provider.providerId === PASSWORD_PROVIDER_ID
    );
}
