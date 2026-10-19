import { randomUUID } from "node:crypto";
import { UserType } from "@repo/sdk/src/types";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getFirestoreAdmin } = await import("@repo/auth/server");
const { userRepository } = await import(
    "@/(shared)/repositories/user.repository"
);

const RUN_ID = randomUUID();
const referenceIdFor = (label: string) => `emu-archived-${label}-${RUN_ID}`;
const usedReferenceIds: string[] = [];

const newReferenceId = (label: string) => {
    const referenceId = referenceIdFor(label);
    usedReferenceIds.push(referenceId);
    return referenceId;
};

const writeRawProfile = (fields: Record<string, unknown>) =>
    getFirestoreAdmin().collection("user").add(fields);

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

describe("userRepository.hasArchivedProfile against the Firestore emulator", () => {
    it("is true once the profile is soft deleted through the repository", async () => {
        const referenceId = newReferenceId("soft-deleted");
        const created = await userRepository.create({
            reference_id: referenceId,
            type: UserType.COMMON,
        } as Parameters<typeof userRepository.create>[0]);

        expect(await userRepository.hasArchivedProfile(referenceId)).toBe(
            false
        );

        await userRepository.delete(created.id);

        expect(await userRepository.hasArchivedProfile(referenceId)).toBe(true);
        expect(await userRepository.findByReferenceId(referenceId)).toBeNull();
    });

    it("is false for a live profile whose deletedAt is stored as null", async () => {
        const referenceId = newReferenceId("live");
        await writeRawProfile({
            reference_id: referenceId,
            type: UserType.COMMON,
            deletedAt: null,
        });

        expect(await userRepository.hasArchivedProfile(referenceId)).toBe(
            false
        );
    });

    it("is false for a profile written without the deletedAt field", async () => {
        const referenceId = newReferenceId("no-field");
        await writeRawProfile({
            reference_id: referenceId,
            type: UserType.COMMON,
        });

        expect(await userRepository.hasArchivedProfile(referenceId)).toBe(
            false
        );
    });

    it("is false for a uid that has no profile at all", async () => {
        expect(
            await userRepository.hasArchivedProfile(newReferenceId("absent"))
        ).toBe(false);
    });

    it("is true when an archived profile sits next to a live one for the same uid", async () => {
        const referenceId = newReferenceId("mixed");
        await writeRawProfile({
            reference_id: referenceId,
            type: UserType.COMMON,
            deletedAt: null,
        });
        await writeRawProfile({
            reference_id: referenceId,
            type: UserType.COMMON,
            deletedAt: new Date(),
        });

        expect(await userRepository.hasArchivedProfile(referenceId)).toBe(true);
        expect(
            (await userRepository.findByReferenceId(referenceId))?.reference_id
        ).toBe(referenceId);
    });
});
