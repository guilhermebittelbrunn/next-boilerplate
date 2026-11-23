import type { UserRecord } from "firebase-admin/auth";
import { Timestamp } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";
import {
    mergeAuthAndFirestore,
    serializeFirestoreData,
    toSessionUser,
} from "@/(shared)/mappers/user.mapper";

const CREATED_AT_ISO = "2024-03-01T10:00:00.000Z";

function authRecord(overrides: Record<string, unknown> = {}): UserRecord {
    return {
        uid: "auth-uid-1",
        email: "qa-common@example.com",
        emailVerified: true,
        displayName: "QA Common",
        photoURL: null,
        phoneNumber: null,
        disabled: false,
        metadata: {
            creationTime: "Mon, 01 Jan 2024 00:00:00 GMT",
            lastSignInTime: null,
            lastRefreshTime: null,
        },
        providerData: [],
        customClaims: null,
        tokensValidAfterTime: undefined,
        ...overrides,
    } as unknown as UserRecord;
}

function overTheWire(payload: Record<string, unknown>) {
    return JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
}

describe("serializeFirestoreData", () => {
    it("converts a Timestamp into an ISO string", () => {
        const serialized = serializeFirestoreData({
            createdAt: Timestamp.fromDate(new Date(CREATED_AT_ISO)),
        });

        expect(serialized.createdAt).toBe(CREATED_AT_ISO);
    });

    it("converts Timestamps nested in objects and arrays", () => {
        const timestamp = Timestamp.fromDate(new Date(CREATED_AT_ISO));

        const serialized = serializeFirestoreData({
            audit: { lastSeenAt: timestamp },
            sessions: [{ startedAt: timestamp }, timestamp],
        });

        expect(serialized.audit).toEqual({ lastSeenAt: CREATED_AT_ISO });
        expect(serialized.sessions).toEqual([
            { startedAt: CREATED_AT_ISO },
            CREATED_AT_ISO,
        ]);
    });

    it("keeps a value already stored as an ISO string untouched", () => {
        const serialized = serializeFirestoreData({
            createdAt: CREATED_AT_ISO,
            deletedAt: null,
            type: "common",
            enabled: true,
        });

        expect(serialized).toEqual({
            createdAt: CREATED_AT_ISO,
            deletedAt: null,
            type: "common",
            enabled: true,
        });
    });
});

describe("mergeAuthAndFirestore", () => {
    it("serializes the Firestore side, so a Timestamp never reaches the client as an object", () => {
        const merged = mergeAuthAndFirestore(authRecord(), {
            id: "profile-1",
            reference_id: "auth-uid-1",
            type: "common",
            createdAt: Timestamp.fromDate(new Date(CREATED_AT_ISO)),
            updatedAt: Timestamp.fromDate(new Date(CREATED_AT_ISO)),
            deletedAt: null,
        });

        const payload = overTheWire(merged);

        expect(payload.createdAt).toBe(CREATED_AT_ISO);
        expect(payload.updatedAt).toBe(CREATED_AT_ISO);
        expect(payload.deletedAt).toBeNull();
        expect(JSON.stringify(payload)).not.toContain("_seconds");
    });

    it("serializes a Date written in the same request, not just a stored Timestamp", () => {
        const merged = mergeAuthAndFirestore(authRecord(), {
            id: "profile-1",
            type: "common",
            createdAt: new Date(CREATED_AT_ISO),
            updatedAt: new Date(CREATED_AT_ISO),
            deletedAt: null,
        });

        const payload = overTheWire(merged);

        expect(payload.createdAt).toBe(CREATED_AT_ISO);
        expect(payload.updatedAt).toBe(CREATED_AT_ISO);
    });

    /**
     * The auth account is spread over the profile document, and `lastAccessAt` only exists
     * on the Firestore side: if it were dropped or left as a Timestamp here, the listing
     * would read every account as never accessed or print an invalid date.
     */
    it("carries the last access stamp to the client as an ISO string", () => {
        const LAST_ACCESS_ISO = "2026-09-17T14:45:00.000Z";

        const merged = mergeAuthAndFirestore(authRecord(), {
            id: "profile-1",
            reference_id: "auth-uid-1",
            type: "common",
            createdAt: Timestamp.fromDate(new Date(CREATED_AT_ISO)),
            updatedAt: Timestamp.fromDate(new Date(CREATED_AT_ISO)),
            deletedAt: null,
            lastAccessAt: Timestamp.fromDate(new Date(LAST_ACCESS_ISO)),
        });

        const payload = overTheWire(merged);

        expect(payload.lastAccessAt).toBe(LAST_ACCESS_ISO);
        expect(JSON.stringify(payload)).not.toContain("_seconds");
    });

    it("leaves the last access stamp absent for a profile that predates the field", () => {
        const merged = mergeAuthAndFirestore(authRecord(), {
            id: "profile-1",
            reference_id: "auth-uid-1",
            type: "common",
            createdAt: Timestamp.fromDate(new Date(CREATED_AT_ISO)),
            deletedAt: null,
        });

        expect(merged.lastAccessAt).toBeUndefined();
    });

    it("keeps a Firestore side already stored as ISO strings untouched", () => {
        const merged = mergeAuthAndFirestore(authRecord(), {
            id: "profile-1",
            type: "common",
            createdAt: CREATED_AT_ISO,
        });

        expect(merged.createdAt).toBe(CREATED_AT_ISO);
        expect(merged.type).toBe("common");
    });

    it("lets the auth account win over a stale copy in the profile document", () => {
        const merged = mergeAuthAndFirestore(
            authRecord({
                email: "current@example.com",
                displayName: "Current",
            }),
            {
                email: "stale@example.com",
                displayName: "Stale",
                type: "admin",
            }
        );

        expect(merged.email).toBe("current@example.com");
        expect(merged.displayName).toBe("Current");
        expect(merged.type).toBe("admin");
    });

    it("returns only the auth account when there is no profile document", () => {
        expect(mergeAuthAndFirestore(authRecord(), null).uid).toBe(
            "auth-uid-1"
        );
        expect(mergeAuthAndFirestore(authRecord(), {}).uid).toBe("auth-uid-1");
        expect(mergeAuthAndFirestore(authRecord(), {}).type).toBeUndefined();
    });
});

describe("toSessionUser", () => {
    const SESSION_KEYS = ["email", "onboarding", "preferences", "type", "uid"];

    it("keeps exactly the five session fields and drops the internal ones", () => {
        const merged = mergeAuthAndFirestore(
            authRecord({
                customClaims: { role: "admin" },
                tokensValidAfterTime: "Mon, 01 Jan 2024 00:00:00 GMT",
                providerData: [{ providerId: "password", uid: "x" }],
            }),
            {
                id: "profile-1",
                reference_id: "auth-uid-1",
                type: "common",
                createdAt: Timestamp.fromDate(new Date(CREATED_AT_ISO)),
                stripeCustomerId: "cus_internal",
                subscription: { status: "active" },
                entitlements: { plan: "pro" },
                preferences: { theme: "dark", locale: "en" },
                onboarding: { step: "preferences", completedAt: null },
                someFieldAddedLater: "private",
            }
        );

        const sessionUser = overTheWire(toSessionUser(merged));

        expect(Object.keys(sessionUser).sort()).toEqual(SESSION_KEYS);
        expect(sessionUser).toEqual({
            uid: "auth-uid-1",
            type: "common",
            email: "qa-common@example.com",
            preferences: { theme: "dark", locale: "en" },
            onboarding: { step: "preferences", completedAt: null },
        });
    });

    it("answers null for every field the profile does not carry", () => {
        const sessionUser = toSessionUser(
            mergeAuthAndFirestore(authRecord({ email: undefined }), null)
        );

        expect(sessionUser).toEqual({
            uid: "auth-uid-1",
            type: null,
            email: null,
            preferences: null,
            onboarding: null,
        });
    });

    it("refuses a type outside the known roles and non-object nested fields", () => {
        const sessionUser = toSessionUser({
            uid: "auth-uid-1",
            type: "superuser",
            email: 42,
            preferences: ["dark"],
            onboarding: "done",
        });

        expect(sessionUser).toEqual({
            uid: "auth-uid-1",
            type: null,
            email: null,
            preferences: null,
            onboarding: null,
        });
    });
});
