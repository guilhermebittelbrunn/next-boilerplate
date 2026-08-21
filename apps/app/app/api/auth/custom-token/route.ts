import { customTokenPOST } from "@repo/auth/session-routes";

/**
 * Cross-app SSO bootstrap: returns a Firebase custom token derived from the shared
 * session cookie so this origin's client SDK can sign in. Logic in @repo/auth.
 */
export function POST() {
    return customTokenPOST();
}
