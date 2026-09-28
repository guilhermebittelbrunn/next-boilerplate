import { randomUUID } from "node:crypto";
import type { UserDTO } from "@repo/sdk/src/types";
import { UserType } from "@repo/sdk/src/types";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/env", () => ({
    env: {
        FIREBASE_STORAGE_BUCKET: "a-real-bucket.firebasestorage.app",
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    },
}));

vi.mock("@/(shared)/repositories/entity.repository", () => ({
    entityRepository: { purgeAllByUserId: vi.fn().mockResolvedValue(0) },
}));

vi.mock("@/(shared)/repositories/audit-event.repository", () => ({
    auditEventRepository: { anonymizeUserLabels: vi.fn().mockResolvedValue(0) },
}));

vi.mock("@/(shared)/repositories/user.repository", () => ({
    userRepository: { purgeProfile: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("@repo/payments", () => ({
    getStripe: () => null,
    isPaymentsConfigured: () => false,
}));

vi.mock("@repo/auth/server", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@repo/auth/server")>()),
    getAuthInstance: () => ({
        deleteUser: vi.fn().mockResolvedValue(undefined),
    }),
    revokeUserSessions: vi.fn().mockResolvedValue(undefined),
}));

const { deleteObjectsByPrefix, listObjectPaths, ownerPrefix, putObject } =
    await import("@/(shared)/lib/storage");
const { runAccountErasure } = await import("@/(shared)/lib/account-erasure");

const SUBJECT_ID = `emu-erased-${randomUUID()}`;
const BYSTANDER_ID = `emu-bystander-${randomUUID()}`;
const PNG_MAGIC = Buffer.from("89504e470d0a1a0a", "hex");

const objectPath = (ownerId: string) =>
    `${ownerPrefix(ownerId)}${randomUUID()}.png`;

afterAll(async () => {
    await deleteObjectsByPrefix(ownerPrefix(SUBJECT_ID));
    await deleteObjectsByPrefix(ownerPrefix(BYSTANDER_ID));
});

describe("account erasure against the storage emulator", () => {
    it("deletes every object of the data subject and nobody else's", async () => {
        const bystanderObject = objectPath(BYSTANDER_ID);
        await putObject(objectPath(SUBJECT_ID), PNG_MAGIC, "image/png");
        await putObject(objectPath(SUBJECT_ID), PNG_MAGIC, "image/png");
        await putObject(bystanderObject, PNG_MAGIC, "image/png");

        const report = await runAccountErasure({
            profile: { id: SUBJECT_ID, type: UserType.COMMON } as UserDTO,
            uid: `emu-uid-${randomUUID()}`,
            requestId: null,
        });

        expect(report.find((step) => step.step === "storage")).toEqual({
            step: "storage",
            status: "done",
            count: 2,
        });
        expect(await listObjectPaths(ownerPrefix(SUBJECT_ID))).toEqual([]);
        expect(await listObjectPaths(ownerPrefix(BYSTANDER_ID))).toEqual([
            bystanderObject,
        ]);
    });
});
