import { getAuthInstance, revokeUserSessionsOrThrow } from "@repo/auth/server";

function isMissingAccount(error: unknown): boolean {
    return (error as { code?: unknown } | null)?.code === "auth/user-not-found";
}

/**
 * Disabled first, so no new token can be minted between the two calls. Throws when
 * either call is refused, because sessions left open come back if the account is ever
 * enabled again. An account already gone from Firebase Auth has no access left to take.
 */
export async function revokeAccountAccess(uid: string): Promise<void> {
    try {
        await getAuthInstance().updateUser(uid, { disabled: true });
        await revokeUserSessionsOrThrow(uid);
    } catch (error) {
        if (isMissingAccount(error)) {
            return;
        }
        throw error;
    }
}
