import { sessionDELETE, sessionPOST } from "@repo/auth/session-routes";
import { sessionAuthority } from "@/lib/server/sessionAuthority";

/**
 * Cross-app session cookie endpoint. Logic lives in `@repo/auth/session-routes`
 * so web + app stay in sync (mints a Firebase session cookie shared across the
 * registrable domain; DELETE signs this browser out and leaves the account's other
 * sessions alive).
 */
export function POST(request: Request) {
    return sessionPOST(request, sessionAuthority);
}

export function DELETE() {
    return sessionDELETE(sessionAuthority);
}
