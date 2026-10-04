import type { AccountSessionDeviceType } from "@repo/sdk/src/types";
import type { AllOptional } from "@repo/shared/utils";
import { normalizeFirestoreInstant, stringIfExists } from "@repo/shared/utils";
import Mapper from "./Mapper";

export type SessionRevokedReason = "signed-out" | "revoked" | "others";

/**
 * Internal to the API: the public DTO adds `current`, which depends on the request, and
 * leaves out the owner and the revocation fields.
 */
export type SessionRecord = {
    /** Firestore document id, `<uid>_<sessionKey>`. */
    id: string;
    uid: string;
    sessionKey: string;
    signedInAt: string;
    lastSeenAt: string;
    browser: string | null;
    os: string | null;
    deviceType: AccountSessionDeviceType | null;
    revokedAt: string | null;
    revokedReason: SessionRevokedReason | null;
    /** Set on the session that ended all the others: they started before this instant. */
    othersRevokedBefore: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
};

export type SessionFirestoreRow = Record<string, unknown> & { id: string };

const DEVICE_TYPES = new Set<AccountSessionDeviceType>([
    "desktop",
    "mobile",
    "tablet",
]);
const REVOKED_REASONS = new Set<SessionRevokedReason>([
    "signed-out",
    "revoked",
    "others",
]);
const MS_PER_SECOND = 1000;

function instantOrNull(value: unknown): string | null {
    return value == null ? null : normalizeFirestoreInstant(value);
}

function memberOrNull<T extends string>(set: Set<T>, value: unknown): T | null {
    return typeof value === "string" && set.has(value as T)
        ? (value as T)
        : null;
}

function signedInAtOf(record: Record<string, unknown>, key: string): string {
    if (record.signedInAt != null) {
        return normalizeFirestoreInstant(record.signedInAt);
    }
    const seconds = Number(key);
    return Number.isFinite(seconds)
        ? new Date(seconds * MS_PER_SECOND).toISOString()
        : normalizeFirestoreInstant(null);
}

class BaseSessionMapper extends Mapper<SessionFirestoreRow, SessionRecord> {
    toDTO(entity: SessionFirestoreRow): SessionRecord {
        const { id, ...raw } = entity;
        const record = raw as Record<string, unknown>;
        const sessionKey = String(record.sessionKey ?? "");
        const signedInAt = signedInAtOf(record, sessionKey);
        return {
            id,
            uid: String(record.uid ?? ""),
            sessionKey,
            signedInAt,
            // A session ended before the API ever saw it in use has no last use.
            lastSeenAt: instantOrNull(record.lastSeenAt) ?? signedInAt,
            browser: stringIfExists(record.browser),
            os: stringIfExists(record.os),
            deviceType: memberOrNull(DEVICE_TYPES, record.deviceType),
            revokedAt: instantOrNull(record.revokedAt),
            revokedReason: memberOrNull(REVOKED_REASONS, record.revokedReason),
            othersRevokedBefore: instantOrNull(record.othersRevokedBefore),
            createdAt: normalizeFirestoreInstant(record.createdAt),
            updatedAt: normalizeFirestoreInstant(record.updatedAt),
            deletedAt: instantOrNull(record.deletedAt),
        };
    }

    toPersistence(
        input: AllOptional<SessionRecord>
    ): AllOptional<Record<string, unknown>> {
        const out: Record<string, unknown> = {};
        const keys: (keyof SessionRecord)[] = [
            "uid",
            "sessionKey",
            "signedInAt",
            "lastSeenAt",
            "browser",
            "os",
            "deviceType",
            "revokedAt",
            "revokedReason",
            "othersRevokedBefore",
        ];
        for (const key of keys) {
            if (input[key] !== undefined) {
                out[key as string] = input[key] as unknown;
            }
        }
        return out as AllOptional<Record<string, unknown>>;
    }
}

export const sessionMapper = new BaseSessionMapper();
