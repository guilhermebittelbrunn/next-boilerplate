import { verifyIdTokenClaims } from "@repo/auth/server";
import { GOOGLE_PROVIDER_ID } from "./auth-providers";

/** Firebase's own window for a "recent login". */
export const RECENT_SIGN_IN_MAX_AGE_SECONDS = 300;

const MILLISECONDS_IN_A_SECOND = 1000;

/**
 * The session cookie bootstrap signs in with a custom token, which resets `auth_time` but
 * never `sign_in_provider`, so only a real Google sign-in from the last minutes passes.
 */
export async function isRecentGoogleSignIn(
    token: string,
    uid: string,
    nowMs = Date.now()
): Promise<boolean> {
    const claims = await verifyIdTokenClaims(token);
    if (!claims || claims.uid !== uid) {
        return false;
    }
    if (claims.firebase?.sign_in_provider !== GOOGLE_PROVIDER_ID) {
        return false;
    }
    if (typeof claims.auth_time !== "number") {
        return false;
    }
    const ageSeconds = nowMs / MILLISECONDS_IN_A_SECOND - claims.auth_time;
    return ageSeconds >= 0 && ageSeconds <= RECENT_SIGN_IN_MAX_AGE_SECONDS;
}
