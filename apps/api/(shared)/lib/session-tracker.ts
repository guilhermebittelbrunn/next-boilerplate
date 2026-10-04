import { isWithinAbsoluteCap } from "@repo/auth/session";
import type { AccountSessionDTO } from "@repo/sdk/src/types";
import { logEvent } from "@repo/shared/utils/helpers/log";
import type { SessionRecord } from "../mappers/session.mapper";
import { sessionRepository } from "../repositories/session.repository";
import { ACTIVITY_WINDOW_MINUTES } from "./activity-windows";
import { type DeviceDescription, describeUserAgent } from "./user-agent";

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60_000;
const LAST_SEEN_WINDOW_MS = ACTIVITY_WINDOW_MINUTES * MS_PER_MINUTE;

export type SessionTrackInput = {
    uid: string;
    sessionKey: string;
    userAgent: string | null;
    now?: Date;
};

function reasonOf(error: unknown): string {
    // Only the error name: the message of a Firestore failure carries document paths,
    // which name the account.
    return error instanceof Error ? error.name : "unknown";
}

function isStale(lastSeenAt: string, now: Date): boolean {
    return now.getTime() - Date.parse(lastSeenAt) >= LAST_SEEN_WINDOW_MS;
}

function startedAtMs(sessionKey: string): number {
    return Number(sessionKey) * MS_PER_SECOND;
}

/**
 * The key only knows the second of the sign-in. A session from the same second as the
 * watermark may have started before it, so it counts as covered: a sign-in less than a
 * second after the click has to be repeated, but none from before the click survives.
 */
function mayHaveStartedBefore(sessionKey: string, instant: string): boolean {
    return Date.parse(instant) > startedAtMs(sessionKey);
}

async function isCoveredByOthersRevocation(
    uid: string,
    sessionKey: string
): Promise<boolean> {
    const sessions = await sessionRepository.listByUid(uid);
    return sessions.some(
        (session) =>
            session.sessionKey !== sessionKey &&
            session.othersRevokedBefore !== null &&
            mayHaveStartedBefore(sessionKey, session.othersRevokedBefore)
    );
}

/** The device is only filled in once: requests from the front-end servers carry none. */
async function touchKnownSession(
    record: SessionRecord,
    device: DeviceDescription | null,
    now: Date
): Promise<void> {
    const missingDevice = device !== null && record.browser === null;
    if (missingDevice || isStale(record.lastSeenAt, now)) {
        await sessionRepository.touchSeen(
            record.id,
            now,
            missingDevice ? device : null
        );
    }
}

/** Covered by an earlier "end the other sessions", the answer is a refusal even if the write fails. */
async function recordNewSession(
    input: SessionTrackInput,
    device: DeviceDescription | null,
    now: Date
): Promise<"active" | "revoked"> {
    let covered = false;
    try {
        covered = await isCoveredByOthersRevocation(
            input.uid,
            input.sessionKey
        );
        await sessionRepository.createSeen({
            uid: input.uid,
            sessionKey: input.sessionKey,
            at: now,
            device,
            revokedAt: covered ? now : null,
        });
    } catch (error) {
        logEvent("auth", "session-touch-failed", { reason: reasonOf(error) });
    }
    return covered ? "revoked" : "active";
}

/**
 * Called on every authenticated request. Answers whether the session was ended from
 * another device, records it on first contact and moves its last use forward at most once
 * per activity window.
 *
 * A failed read lets the request through. The guard reads the profile from the same
 * Firestore right after, so an outage fails the request anyway; refusing here would turn
 * a blip into every user being signed out.
 */
export async function trackSession(
    input: SessionTrackInput
): Promise<"active" | "revoked"> {
    const now = input.now ?? new Date();
    let record: SessionRecord | null;
    try {
        record = await sessionRepository.findByUidAndKey(
            input.uid,
            input.sessionKey
        );
    } catch (error) {
        logEvent("auth", "session-check-failed", { reason: reasonOf(error) });
        return "active";
    }

    if (record?.revokedAt) {
        return "revoked";
    }

    const device = describeUserAgent(input.userAgent);
    if (!record) {
        return await recordNewSession(input, device, now);
    }

    try {
        await touchKnownSession(record, device, now);
    } catch (error) {
        logEvent("auth", "session-touch-failed", { reason: reasonOf(error) });
    }
    return "active";
}

/**
 * Before this instant every credential of the account is dead: "sign out everywhere",
 * a password or email change and disabling the account all move it.
 */
function revokedForAll(
    session: SessionRecord,
    tokensValidAfterTime: string | undefined
): boolean {
    if (!tokensValidAfterTime) {
        return false;
    }
    const validAfterMs = Date.parse(tokensValidAfterTime);
    return (
        Number.isFinite(validAfterMs) &&
        startedAtMs(session.sessionKey) < validAfterMs
    );
}

export function selectActiveSessions(
    records: SessionRecord[],
    options: {
        currentKey: string | null;
        tokensValidAfterTime: string | undefined;
    }
): AccountSessionDTO[] {
    return records
        .filter(
            (session) =>
                !(
                    session.revokedAt ||
                    revokedForAll(session, options.tokensValidAfterTime)
                ) && isWithinAbsoluteCap(Number(session.sessionKey))
        )
        .map(
            (session): AccountSessionDTO => ({
                id: session.sessionKey,
                current: session.sessionKey === options.currentKey,
                browser: session.browser,
                os: session.os,
                deviceType: session.deviceType,
                signedInAt: session.signedInAt,
                lastSeenAt: session.lastSeenAt,
            })
        )
        .sort((a, b) => {
            if (a.current !== b.current) {
                return a.current ? -1 : 1;
            }
            return Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt);
        });
}
