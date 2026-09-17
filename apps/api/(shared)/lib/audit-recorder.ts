import { AuditAction, AuditTargetType } from "@repo/sdk/src/types";
import { logEvent } from "@repo/shared/utils/helpers/log";
import { resolveUserAuditLabel } from "@/(shared)/lib/audit-label";
import { auditEventRepository } from "@/(shared)/repositories/audit-event.repository";

/**
 * An admin acting on someone's behalf touches every screen they open, so one event per
 * request would bury the trail in noise. Activity is recorded as a window instead: the
 * document id is derived from the pair and the window, so repeats collapse into it.
 */
const MINUTE_MS = 60_000;
export const IMPERSONATION_WINDOW_MINUTES = 15;
export const IMPERSONATION_WINDOW_MS = IMPERSONATION_WINDOW_MINUTES * MINUTE_MS;

const DEDUPE_CACHE_MAX = 500;

export type AuditEventInput = {
    action: AuditAction;
    actorUserId: string;
    actorUid: string;
    actorLabel: string | null;
    targetType: AuditTargetType;
    targetUserId: string | null;
    targetLabel: string | null;
    changedFields?: string[];
    onBehalfOfUserId?: string | null;
    requestId: string | null;
};

export type ImpersonationSessionInput = {
    actorUserId: string;
    actorUid: string;
    actorLabel: string | null;
    subjectUserId: string;
    subjectUid: string;
    requestId: string | null;
};

const writtenWindows = new Map<string, number>();

function rememberWindow(key: string): void {
    writtenWindows.set(key, Date.now());
    while (writtenWindows.size > DEDUPE_CACHE_MAX) {
        const oldest = writtenWindows.keys().next();
        if (oldest.done) {
            return;
        }
        writtenWindows.delete(oldest.value);
    }
}

function involvedUserIdsOf(ids: (string | null | undefined)[]): string[] {
    return Array.from(new Set(ids.filter((id): id is string => Boolean(id))));
}

export function impersonationWindowKey(
    actorUid: string,
    subjectUid: string,
    atMs: number
): { key: string; startedAtMs: number } {
    const startedAtMs =
        Math.floor(atMs / IMPERSONATION_WINDOW_MS) * IMPERSONATION_WINDOW_MS;
    return {
        key: `imp_${actorUid}_${subjectUid}_${startedAtMs}`,
        startedAtMs,
    };
}

function reasonOf(error: unknown): string {
    // Only the error name: the message of a Firestore failure carries document paths and
    // echoed payloads, which is exactly the personal data the trail must not duplicate.
    return error instanceof Error ? error.name : "unknown";
}

/**
 * The gRPC status Firestore attaches to a refused write (7 PERMISSION_DENIED,
 * 8 RESOURCE_EXHAUSTED, 14 UNAVAILABLE, ...). It is the only part of the failure that
 * says what to do about it, and unlike the message it carries no payload.
 */
function statusOf(error: unknown): number | undefined {
    const code = (error as { code?: unknown } | null)?.code;
    return typeof code === "number" ? code : undefined;
}

/**
 * Never throws. Every audited action has already taken effect by the time the trail is
 * written, and half of them wrote to Firebase Auth, which cannot be rolled back with a
 * Firestore transaction — answering 500 would report a failure for work that succeeded.
 * A refused write falls back to the structured log, correlated by `requestId`.
 */
export async function recordAuditEvent(input: AuditEventInput): Promise<void> {
    try {
        await auditEventRepository.append({
            action: input.action,
            actorUserId: input.actorUserId,
            actorUid: input.actorUid,
            actorLabel: input.actorLabel,
            onBehalfOfUserId: input.onBehalfOfUserId ?? null,
            targetType: input.targetType,
            targetUserId: input.targetUserId,
            targetLabel: input.targetLabel,
            changedFields: input.changedFields ?? [],
            involvedUserIds: involvedUserIdsOf([
                input.actorUserId,
                input.targetUserId,
                input.onBehalfOfUserId,
            ]),
            requestId: input.requestId,
            windowEndsAt: null,
        });
    } catch (error) {
        logEvent("audit", "write-failed", {
            action: input.action,
            actorUserId: input.actorUserId,
            requestId: input.requestId,
            reason: reasonOf(error),
            status: statusOf(error),
        });
    }
}

export async function recordImpersonationSession(
    input: ImpersonationSessionInput
): Promise<void> {
    const { key, startedAtMs } = impersonationWindowKey(
        input.actorUid,
        input.subjectUid,
        Date.now()
    );

    // The cache only saves a round-trip: it warms and cools with the serverless process,
    // and the id refused by Firestore is what actually guarantees a single document.
    if (writtenWindows.has(key)) {
        return;
    }

    try {
        // Resolved only past the cache check: naming the subject costs a Firebase Auth
        // lookup, and every request of the session lands here while only the first writes.
        const subjectLabel = await resolveUserAuditLabel(input.subjectUid);

        await auditEventRepository.appendOnce(key, {
            action: AuditAction.IMPERSONATION_SESSION,
            actorUserId: input.actorUserId,
            actorUid: input.actorUid,
            actorLabel: input.actorLabel,
            onBehalfOfUserId: input.subjectUserId,
            targetType: AuditTargetType.USER,
            targetUserId: input.subjectUserId,
            targetLabel: subjectLabel,
            changedFields: [],
            involvedUserIds: involvedUserIdsOf([
                input.actorUserId,
                input.subjectUserId,
            ]),
            requestId: input.requestId,
            windowEndsAt: new Date(
                startedAtMs + IMPERSONATION_WINDOW_MS
            ).toISOString(),
        });
        rememberWindow(key);
    } catch (error) {
        logEvent("audit", "impersonation-write-failed", {
            actorUid: input.actorUid,
            requestId: input.requestId,
            reason: reasonOf(error),
            status: statusOf(error),
        });
    }
}

/** Test seam: the dedupe cache outlives a single request by design. */
export function resetImpersonationDedupeCache(): void {
    writtenWindows.clear();
}
