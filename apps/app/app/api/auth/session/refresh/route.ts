import { sessionRefreshPOST } from "@repo/auth/session-routes";
import { sessionAuthority } from "@/lib/server/sessionAuthority";

/**
 * Slides the shared session cookie forward from a still-valid cookie, up to the
 * absolute lifetime counted from the original sign-in. Logic in @repo/auth.
 */
export function POST(request: Request) {
    return sessionRefreshPOST(request, sessionAuthority);
}
