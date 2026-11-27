import { randomUUID } from "node:crypto";
import type { WriteBatch } from "firebase-admin/firestore";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getFirestoreAdmin } = await import("@repo/auth/server");
const { notificationRepository } = await import(
    "@/(shared)/repositories/notification.repository"
);

const RUN_ID = randomUUID();
const GRPC_NOT_FOUND = 5;
const SEEDED_UNREAD = 3;
const SURVIVING_UNREAD = 2;

const notifications = () => getFirestoreAdmin().collection("notification");

afterAll(async () => {
    const leftovers = await notifications()
        .where("userId", "==", `emu-markall-race-${RUN_ID}`)
        .get();
    await Promise.all(leftovers.docs.map((docSnap) => docSnap.ref.delete()));
});

describe("notificationRepository.markRead against the Firestore emulator", () => {
    it("answers null for a missing document and leaves the collection without it", async () => {
        const id = `emu-markread-missing-${RUN_ID}`;
        const ref = notifications().doc(id);

        await expect(ref.update({ readAt: new Date() })).rejects.toMatchObject({
            code: GRPC_NOT_FOUND,
        });

        await expect(notificationRepository.markRead(id)).resolves.toBeNull();
        expect((await ref.get()).exists).toBe(false);
    });
});

describe("notificationRepository.markAllReadByUserId against the Firestore emulator", () => {
    it("rejects a batch whose document vanished with NOT_FOUND and marks the rest on the next pass", async () => {
        const userId = `emu-markall-race-${RUN_ID}`;
        const now = new Date();
        const refs = Array.from({ length: SEEDED_UNREAD }, (_, index) =>
            notifications().doc(`${userId}-${index}`)
        );
        await Promise.all(
            refs.map((ref) =>
                ref.set({
                    userId,
                    type: "welcome",
                    params: {},
                    readAt: null,
                    expiresAt: now,
                    createdAt: now,
                    updatedAt: now,
                    deletedAt: null,
                })
            )
        );

        const firestore = getFirestoreAdmin();
        const originalBatch = firestore.batch.bind(firestore);
        const vanished = refs[0];
        const firstCommitErrors: unknown[] = [];
        const batchSpy = vi
            .spyOn(firestore, "batch")
            .mockImplementationOnce(() => {
                const batch: WriteBatch = originalBatch();
                const commit = batch.commit.bind(batch);
                batch.commit = async () => {
                    await vanished.delete();
                    try {
                        return await commit();
                    } catch (error) {
                        firstCommitErrors.push(error);
                        throw error;
                    }
                };
                return batch;
            });

        try {
            await expect(
                notificationRepository.markAllReadByUserId(userId, now)
            ).resolves.toBe(SURVIVING_UNREAD);
        } finally {
            batchSpy.mockRestore();
        }

        expect(firstCommitErrors).toHaveLength(1);
        expect(firstCommitErrors[0]).toMatchObject({ code: GRPC_NOT_FOUND });
        expect((await vanished.get()).exists).toBe(false);
        await expect(
            notificationRepository.countUnreadByUserId(userId)
        ).resolves.toBe(0);
    });
});
