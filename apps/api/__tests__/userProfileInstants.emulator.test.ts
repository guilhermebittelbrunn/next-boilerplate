import { randomUUID } from "node:crypto";
import { UserType } from "@repo/sdk/src/types";
import { Timestamp } from "firebase-admin/firestore";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getFirestoreAdmin } = await import("@repo/auth/server");
const { userRepository } = await import(
    "@/(shared)/repositories/user.repository"
);
const { serializeFirestoreData } = await import(
    "@/(shared)/mappers/user.mapper"
);

const RUN_ID = randomUUID();
const usedReferenceIds: string[] = [];

const newReferenceId = (label: string) => {
    const referenceId = `emu-instants-${label}-${RUN_ID}`;
    usedReferenceIds.push(referenceId);
    return referenceId;
};

const CREATED_AT = new Date("2026-01-02T03:04:05.000Z");
const EVENT_AT = new Date("2026-03-04T05:06:07.000Z");

async function writeStoredProfile(label: string) {
    const referenceId = newReferenceId(label);
    const customerId = `cus_${label}_${RUN_ID}`;
    const ref = await getFirestoreAdmin()
        .collection("user")
        .add({
            reference_id: referenceId,
            type: UserType.COMMON,
            stripeCustomerId: customerId,
            createdAt: CREATED_AT,
            updatedAt: CREATED_AT,
            deletedAt: null,
            lastAccessAt: EVENT_AT,
            onboarding: { step: "preferences", completedAt: EVENT_AT },
            subscription: {
                subscriptionId: "sub_emu",
                status: "active",
                currentPeriodEnd: null,
                lastEventAt: EVENT_AT,
            },
            entitlements: { features: ["pro"], lastEventAt: EVENT_AT },
        });
    return { id: ref.id, referenceId, customerId };
}

afterAll(async () => {
    const db = getFirestoreAdmin();
    for (const referenceId of usedReferenceIds) {
        const snapshot = await db
            .collection("user")
            .where("reference_id", "==", referenceId)
            .get();
        await Promise.all(snapshot.docs.map((docSnap) => docSnap.ref.delete()));
    }
});

describe("userRepository reads against the Firestore emulator", () => {
    it("hands back every stored Timestamp as Date, on all three lookups", async () => {
        const { id, referenceId, customerId } =
            await writeStoredProfile("reads");

        const profiles = await Promise.all([
            userRepository.findById(id),
            userRepository.findByReferenceId(referenceId),
            userRepository.findByStripeCustomerId(customerId),
        ]);

        for (const profile of profiles) {
            expect(profile?.id).toBe(id);
            expect(profile?.createdAt).toEqual(CREATED_AT);
            expect(profile?.updatedAt).toEqual(CREATED_AT);
            expect(profile?.deletedAt).toBeNull();
            expect(profile?.lastAccessAt).toEqual(EVENT_AT);
            expect(profile?.onboarding?.completedAt).toEqual(EVENT_AT);
            expect(profile?.subscription?.lastEventAt).toEqual(EVENT_AT);
            expect(profile?.subscription?.currentPeriodEnd).toBeNull();
            expect(profile?.entitlements?.lastEventAt).toEqual(EVENT_AT);
        }
    });

    it("stores a Date read from the profile back as a Timestamp", async () => {
        const { id } = await writeStoredProfile("rewrite");
        const profile = await userRepository.findById(id);

        await userRepository.update({ id, onboarding: profile?.onboarding });

        const stored = (
            await getFirestoreAdmin().collection("user").doc(id).get()
        ).data();
        expect(stored?.onboarding.completedAt).toBeInstanceOf(Timestamp);
        expect(stored?.onboarding.completedAt.toDate()).toEqual(EVENT_AT);
        expect(stored?.createdAt).toBeInstanceOf(Timestamp);
    });
});

async function writeProfileWithInstants(label: string, instant: unknown) {
    const referenceId = newReferenceId(label);
    const ref = await getFirestoreAdmin()
        .collection("user")
        .add({
            reference_id: referenceId,
            type: UserType.COMMON,
            createdAt: instant,
            updatedAt: instant,
            deletedAt: null,
            lastAccessAt: instant,
            onboarding: { step: "preferences", completedAt: instant },
            subscription: {
                subscriptionId: "sub_emu",
                status: "active",
                currentPeriodEnd: instant,
                lastEventAt: instant,
            },
            entitlements: { features: ["pro"], lastEventAt: instant },
        });
    return ref.id;
}

async function readThreeWays(id: string) {
    const snap = await getFirestoreAdmin().collection("user").doc(id).get();
    const fromSnapshot = serializeFirestoreData({ ...snap.data(), id });
    const byId = await userRepository.findById(id);
    const listed = (await userRepository.findAll()).find(
        (profile) => profile.id === id
    );
    return { fromSnapshot, byId, listed };
}

const INSTANT_PATHS = [
    ["createdAt"],
    ["updatedAt"],
    ["lastAccessAt"],
    ["onboarding", "completedAt"],
    ["subscription", "currentPeriodEnd"],
    ["subscription", "lastEventAt"],
    ["entitlements", "lastEventAt"],
] as const;

const valueAt = (source: unknown, path: readonly string[]) =>
    path.reduce<unknown>(
        (node, key) => (node as Record<string, unknown> | undefined)?.[key],
        source
    );

describe("userRepository serialization against the Firestore emulator", () => {
    it("serializes findById and findAll to the same ISO strings as the raw snapshot", async () => {
        const id = await writeProfileWithInstants(
            "serialize-timestamp",
            Timestamp.fromDate(CREATED_AT)
        );

        const { fromSnapshot, byId, listed } = await readThreeWays(id);

        expect(byId).not.toBeNull();
        expect(listed).toBeDefined();
        for (const path of INSTANT_PATHS) {
            expect(valueAt(byId, path)).toBeInstanceOf(Date);
            expect(valueAt(listed, path)).toBeInstanceOf(Date);
            expect(valueAt(fromSnapshot, path)).toBe(CREATED_AT.toISOString());
        }
        expect(serializeFirestoreData(byId ?? {})).toEqual(fromSnapshot);
        expect(serializeFirestoreData(listed ?? {})).toEqual(fromSnapshot);
    });

    it("keeps an instant stored as a full ISO string serializing to the same value", async () => {
        const id = await writeProfileWithInstants(
            "serialize-iso",
            CREATED_AT.toISOString()
        );

        const { fromSnapshot, byId, listed } = await readThreeWays(id);

        expect(serializeFirestoreData(byId ?? {})).toEqual(fromSnapshot);
        expect(serializeFirestoreData(listed ?? {})).toEqual(fromSnapshot);
    });

    it("widens an instant stored as a bare date to midnight UTC", async () => {
        const id = await writeProfileWithInstants(
            "serialize-date-only",
            "2026-01-02"
        );

        const { fromSnapshot, byId, listed } = await readThreeWays(id);

        for (const path of INSTANT_PATHS) {
            expect(valueAt(fromSnapshot, path)).toBe("2026-01-02");
            expect(valueAt(serializeFirestoreData(byId ?? {}), path)).toBe(
                "2026-01-02T00:00:00.000Z"
            );
            expect(valueAt(serializeFirestoreData(listed ?? {}), path)).toBe(
                "2026-01-02T00:00:00.000Z"
            );
        }
    });
});
