import { getAuthInstance } from "@repo/auth/server";

/**
 * The Firestore profile holds no email or name — both live in Firebase Auth — so the trail
 * has to read them from there to keep identifying a person after the account is gone.
 * A lookup that fails degrades to an unlabelled event rather than to a failed action.
 */
export async function resolveUserAuditLabel(
    uid: string
): Promise<string | null> {
    try {
        const record = await getAuthInstance().getUser(uid);
        return record.email ?? record.displayName ?? null;
    } catch {
        return null;
    }
}
