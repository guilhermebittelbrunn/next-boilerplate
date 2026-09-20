import { normalizeFirestoreInstant } from "@repo/shared/utils";
import { logEvent } from "@repo/shared/utils/helpers/log";
import { ACTIVITY_WINDOW_MINUTES } from "@/(shared)/lib/activity-windows";
import { userRepository } from "@/(shared)/repositories/user.repository";

const MINUTE_MS = 60_000;

export const ACTIVITY_WINDOW_MS = ACTIVITY_WINDOW_MINUTES * MINUTE_MS;

const DEDUPE_CACHE_MAX = 500;

const stampedWindows = new Map<string, number>();

function rememberWindow(key: string): void {
    stampedWindows.set(key, Date.now());
    while (stampedWindows.size > DEDUPE_CACHE_MAX) {
        const oldest = stampedWindows.keys().next();
        if (oldest.done) {
            return;
        }
        stampedWindows.delete(oldest.value);
    }
}

export function activityWindowStartMs(atMs: number): number {
    return Math.floor(atMs / ACTIVITY_WINDOW_MS) * ACTIVITY_WINDOW_MS;
}

export function activityWindowKey(userId: string, atMs: number): string {
    return `act_${userId}_${activityWindowStartMs(atMs)}`;
}

export function isStampedInWindow(
    lastAccessAt: unknown,
    windowStartMs: number
): boolean {
    if (lastAccessAt == null) {
        return false;
    }
    return Date.parse(normalizeFirestoreInstant(lastAccessAt)) >= windowStartMs;
}

function reasonOf(error: unknown): string {
    // Only the error name: the message of a Firestore failure carries document paths and
    // echoed payloads, which is personal data that must not reach the log.
    return error instanceof Error ? error.name : "unknown";
}

function statusOf(error: unknown): number | undefined {
    const code = (error as { code?: unknown } | null)?.code;
    return typeof code === "number" ? code : undefined;
}

export type ActivityProfile = {
    id: string;
    lastAccessAt?: unknown;
};

/**
 * Never throws. The request that triggers the stamp has already been authorized and is
 * going to be served: refusing the response because a telemetry write failed would trade
 * a side effect for an incident.
 */
export async function recordUserActivity(
    profile: ActivityProfile
): Promise<void> {
    const now = Date.now();
    const windowStartMs = activityWindowStartMs(now);
    const key = activityWindowKey(profile.id, now);

    if (stampedWindows.has(key)) {
        return;
    }

    // The cache only saves the round-trip to Firestore: it warms and cools with the
    // serverless process. What guarantees one write per window is the instant that came
    // in the document the guard already read.
    if (isStampedInWindow(profile.lastAccessAt, windowStartMs)) {
        rememberWindow(key);
        return;
    }

    try {
        await userRepository.touchLastAccess(profile.id, new Date(now));
        rememberWindow(key);
    } catch (error) {
        logEvent("account", "activity-stamp-failed", {
            userId: profile.id,
            reason: reasonOf(error),
            status: statusOf(error),
        });
    }
}

/** Test seam: the dedupe cache outlives a single request by design. */
export function resetActivityDedupeCache(): void {
    stampedWindows.clear();
}
