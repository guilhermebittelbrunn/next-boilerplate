import { customTokenPOST } from "@repo/auth/session-routes";

/**
 * Cross-app SSO bootstrap (mirrors apps/app): returns a Firebase custom token
 * derived from the shared session cookie so web's client SDK can sign in.
 */
export function POST() {
    return customTokenPOST();
}
