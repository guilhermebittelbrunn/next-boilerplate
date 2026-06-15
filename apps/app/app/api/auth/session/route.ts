import { sessionDELETE, sessionPOST } from "@repo/auth/session-routes";

/**
 * Cross-app session cookie endpoint. Logic lives in `@repo/auth/session-routes`
 * so web + app stay in sync (mints a Firebase session cookie shared across the
 * registrable domain; DELETE revokes + clears it everywhere).
 */
export function POST(request: Request) {
    return sessionPOST(request);
}

export function DELETE() {
    return sessionDELETE();
}
