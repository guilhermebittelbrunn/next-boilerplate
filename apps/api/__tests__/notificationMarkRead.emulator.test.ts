import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getFirestoreAdmin } = await import("@repo/auth/server");
const { notificationRepository } = await import(
    "@/(shared)/repositories/notification.repository"
);

const RUN_ID = randomUUID();
const GRPC_NOT_FOUND = 5;

describe("notificationRepository.markRead against the Firestore emulator", () => {
    it("answers null for a missing document and leaves the collection without it", async () => {
        const id = `emu-markread-missing-${RUN_ID}`;
        const ref = getFirestoreAdmin().collection("notification").doc(id);

        await expect(ref.update({ readAt: new Date() })).rejects.toMatchObject({
            code: GRPC_NOT_FOUND,
        });

        await expect(notificationRepository.markRead(id)).resolves.toBeNull();
        expect((await ref.get()).exists).toBe(false);
    });
});
