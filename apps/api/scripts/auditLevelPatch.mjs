/**
 * Kept apart from the backfill so it can be tested without a database.
 *
 * Every event written before levels existed is a sensitive action, so a missing level is
 * filled in as `sensitive`. Firestore cannot match a document on a field it does not
 * have, which is why the level filter needs the field written instead of inferred.
 */
export const SENSITIVE_LEVEL = "sensitive";

/** Returns the patch an audit event needs, or null when it already has a level. */
export function buildAuditLevelPatch(data) {
    if (typeof data?.level === "string" && data.level.length > 0) {
        return null;
    }
    return { level: SENSITIVE_LEVEL };
}
