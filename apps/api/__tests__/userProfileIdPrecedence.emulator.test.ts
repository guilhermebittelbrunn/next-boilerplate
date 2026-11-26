import { randomUUID } from "node:crypto";
import { UserType } from "@repo/sdk/src/types";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getFirestoreAdmin } = await import("@repo/auth/server");
const { userRepository } = await import(
    "@/(shared)/repositories/user.repository"
);

const RUN_ID = randomUUID();
const referenceId = `emu-id-precedence-${RUN_ID}`;

afterAll(async () => {
    const snapshot = await getFirestoreAdmin()
        .collection("user")
        .where("reference_id", "==", referenceId)
        .get();
    await Promise.all(snapshot.docs.map((docSnap) => docSnap.ref.delete()));
});

describe("userRepository identity against the Firestore emulator", () => {
    it("resolves a profile storing another profile's id in its body by its own document id", async () => {
        const forgedId = `victim-${RUN_ID}`;
        const ref = await getFirestoreAdmin().collection("user").add({
            id: forgedId,
            reference_id: referenceId,
            type: UserType.COMMON,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
        });

        const byReference = await userRepository.findByReferenceId(referenceId);
        const byId = await userRepository.findById(ref.id);

        expect(byReference?.id).toBe(ref.id);
        expect(byId?.id).toBe(ref.id);
        expect(Object.values(byReference ?? {})).not.toContain(forgedId);
    });
});
