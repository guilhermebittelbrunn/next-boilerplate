const DAY_MS = 86_400_000;

/**
 * The last access stamp is written at most once per window, per user, so the window is
 * the precision of everything derived from the field: at 15 minutes, "last access" can be
 * up to 15 minutes behind the real one.
 */
export const ACTIVITY_WINDOW_MINUTES = 15;

/** Someone who signed in within this many days counts as active. */
export const ACTIVE_WINDOW_DAYS = 7;

/** Past this many days without signing in, someone counts as inactive. */
export const INACTIVE_AFTER_DAYS = 30;

const STALE_WINDOW_DAYS = 90;

/**
 * Firestore orders `null` before any timestamp, and the profile allows a null stamp, so
 * the oldest bucket is bounded on both sides to keep those documents out of the range.
 */
const TIMESTAMP_FLOOR = new Date(0);

/** `to` open-ended means "up to now": the most recent bucket has no upper bound. */
export type ActivityRange = { from: Date; to: Date | null };

export type ActivityRecencyRanges = {
    last7Days: ActivityRange;
    from8To30Days: ActivityRange;
    from31To90Days: ActivityRange;
    over90Days: ActivityRange;
};

export function buildActivityRecencyRanges(now: Date): ActivityRecencyRanges {
    const at = (days: number) => new Date(now.getTime() - days * DAY_MS);

    return {
        last7Days: { from: at(ACTIVE_WINDOW_DAYS), to: null },
        from8To30Days: {
            from: at(INACTIVE_AFTER_DAYS),
            to: at(ACTIVE_WINDOW_DAYS),
        },
        from31To90Days: {
            from: at(STALE_WINDOW_DAYS),
            to: at(INACTIVE_AFTER_DAYS),
        },
        over90Days: { from: TIMESTAMP_FLOOR, to: at(STALE_WINDOW_DAYS) },
    };
}
