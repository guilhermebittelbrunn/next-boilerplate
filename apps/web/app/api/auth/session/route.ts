import { sessionDELETE, sessionPOST } from "@repo/auth/session-routes";

/**
 * Cross-app session cookie endpoint (mirrors apps/app). Logic lives in
 * `@repo/auth/session-routes` so the web can mint the shared session cookie too.
 */
export function POST(request: Request) {
    return sessionPOST(request);
}

export function DELETE() {
    return sessionDELETE();
}
