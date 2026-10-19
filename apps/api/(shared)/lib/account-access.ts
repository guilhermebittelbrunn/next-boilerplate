import { getAuthInstance, revokeUserSessions } from "@repo/auth/server";

function isMissingAccount(error: unknown): boolean {
    return (error as { code?: unknown } | null)?.code === "auth/user-not-found";
}

/**
 * Disabled first, so no new token can be minted between the two calls. An account
 * already gone from Firebase Auth has no access left to take.
 */
export async function revokeAccountAccess(uid: string): Promise<void> {
    try {
        await getAuthInstance().updateUser(uid, { disabled: true });
    } catch (error) {
        if (isMissingAccount(error)) {
            return;
        }
        throw error;
    }
    await revokeUserSessions(uid);
}
