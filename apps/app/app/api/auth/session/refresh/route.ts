import { sessionRefreshPOST } from "@repo/auth/session-routes";

/**
 * Slides the shared session cookie forward from a still-valid cookie, up to the
 * absolute lifetime counted from the original sign-in. Logic in @repo/auth.
 */
export function POST(request: Request) {
    return sessionRefreshPOST(request);
}
