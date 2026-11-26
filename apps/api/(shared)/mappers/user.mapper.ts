import type { AuthMePayload } from "@repo/sdk/src/actions/auth/action";
import { type UserDTO, UserType } from "@repo/sdk/src/types";
import type { AllOptional } from "@repo/shared/utils";
import type { UserRecord } from "firebase-admin/auth";
import { type DocumentData, Timestamp } from "firebase-admin/firestore";
import type { FirestoreDocumentRow } from "../repositories/base.repository";
import Mapper from "./Mapper";

export function serializeUserRecord(user: UserRecord): Record<string, unknown> {
    return {
        uid: user.uid,
        email: user.email ?? null,
        emailVerified: user.emailVerified,
        displayName: user.displayName ?? null,
        photoURL: user.photoURL ?? null,
        phoneNumber: user.phoneNumber ?? null,
        disabled: user.disabled,
        metadata: {
            creationTime: user.metadata.creationTime,
            lastSignInTime: user.metadata.lastSignInTime,
            lastRefreshTime: user.metadata.lastRefreshTime,
        },
        providerData: user.providerData.map((p) => ({
            providerId: p.providerId,
            uid: p.uid,
            displayName: p.displayName ?? null,
            email: p.email ?? null,
            phoneNumber: p.phoneNumber ?? null,
        })),
        customClaims: user.customClaims ?? null,
        tokensValidAfterTime: user.tokensValidAfterTime,
    };
}

function serializeFirestoreValue(value: unknown): unknown {
    if (value instanceof Timestamp) {
        return value.toDate().toISOString();
    }
    // A profile created within the request carries a plain Date, not a Timestamp:
    // it never went through Firestore. Without this branch it reaches the generic
    // object case below and serializes to {}, since a Date has no own keys.
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (value && typeof value === "object" && !Array.isArray(value)) {
        return serializeFirestoreData(value as DocumentData);
    }
    if (Array.isArray(value)) {
        return value.map((v) => serializeFirestoreValue(v));
    }
    return value;
}

export function serializeFirestoreData(
    data: DocumentData
): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(data)) {
        out[k] = serializeFirestoreValue(v);
    }
    return out;
}

export function mergeAuthAndFirestore(
    authUser: UserRecord,
    firestoreData: Record<string, unknown> | null
): Record<string, unknown> {
    const auth = serializeUserRecord(authUser);
    if (!firestoreData || Object.keys(firestoreData).length === 0) {
        return auth;
    }
    return { ...serializeFirestoreData(firestoreData), ...auth };
}

const plainObjectOrNull = <T>(value: unknown): T | null =>
    value && typeof value === "object" && !Array.isArray(value)
        ? (value as T)
        : null;

const userTypeOrNull = (value: unknown): UserType | null =>
    value === UserType.ADMIN || value === UserType.COMMON ? value : null;

/** The session payload is an allow-list, so a field added to the profile stays private until it is listed. */
export function toSessionUser(merged: Record<string, unknown>): AuthMePayload {
    return {
        uid: String(merged.uid),
        type: userTypeOrNull(merged.type),
        email: typeof merged.email === "string" ? merged.email : null,
        preferences: plainObjectOrNull(merged.preferences),
        onboarding: plainObjectOrNull(merged.onboarding),
    };
}

/** A value that is not a readable instant is handed back as stored rather than turned into an invalid Date. */
function toDate(value: unknown): unknown {
    if (value instanceof Date) {
        return value;
    }
    if (typeof value === "string") {
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? value : parsed;
    }
    const maybeTimestamp = value as { toDate?: () => Date } | null | undefined;
    if (typeof maybeTimestamp?.toDate === "function") {
        return maybeTimestamp.toDate();
    }
    return value;
}

/** Rewrites only the listed keys the object carries, so an absent field stays absent. */
function withInstants(value: unknown, keys: readonly string[]): unknown {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return value;
    }
    const out: Record<string, unknown> = {
        ...(value as Record<string, unknown>),
    };
    for (const key of keys) {
        if (key in out && out[key] != null) {
            out[key] = toDate(out[key]);
        }
    }
    return out;
}

const PROFILE_INSTANTS = [
    "createdAt",
    "updatedAt",
    "deletedAt",
    "lastAccessAt",
] as const;

const NESTED_INSTANTS = {
    onboarding: ["completedAt"],
    subscription: ["currentPeriodEnd", "lastEventAt"],
    entitlements: ["lastEventAt"],
} as const;

/**
 * Copies the whole document: profiles carry fields outside `UserDTO` that callers still
 * read, and an absent `onboarding` or `lastAccessAt` has a meaning of its own.
 */
class UserMapper extends Mapper<FirestoreDocumentRow, UserDTO> {
    toDTO(row: FirestoreDocumentRow): UserDTO {
        const dto = withInstants(row, PROFILE_INSTANTS) as Record<
            string,
            unknown
        >;
        for (const [field, keys] of Object.entries(NESTED_INSTANTS)) {
            if (field in dto) {
                dto[field] = withInstants(dto[field], keys);
            }
        }
        return dto as unknown as UserDTO;
    }

    toPersistence(
        input: AllOptional<UserDTO>
    ): AllOptional<Record<string, unknown>> {
        const {
            id: _id,
            createdAt: _createdAt,
            updatedAt: _updatedAt,
            deletedAt: _deletedAt,
            ...rest
        } = input;
        return rest as AllOptional<Record<string, unknown>>;
    }
}

export const userMapper = new UserMapper();
