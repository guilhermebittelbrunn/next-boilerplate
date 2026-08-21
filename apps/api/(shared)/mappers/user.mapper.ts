import type { UserRecord } from "firebase-admin/auth";
import { type DocumentData, Timestamp } from "firebase-admin/firestore";

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
    return { ...firestoreData, ...auth };
}
