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
    entityRepository: {
        purgeByOrganization: vi.fn().mockResolvedValue(0),
        purgeUnscopedByUserId: vi.fn().mockResolvedValue(0),
    },
}));

const { HOME_ORGANIZATION_ID } = vi.hoisted(() => ({
    HOME_ORGANIZATION_ID: `emu-home-${crypto.randomUUID()}`,
}));

vi.mock("@/(shared)/repositories/organization.repository", () => ({
    organizationRepository: {
        findOwnedBy: vi.fn().mockResolvedValue({ id: HOME_ORGANIZATION_ID }),
        purgeById: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock("@/(shared)/repositories/organization-member.repository", () => ({
    organizationMemberRepository: {
        findByUserId: vi.fn().mockResolvedValue(null),
        remove: vi.fn().mockResolvedValue(true),
        purgeByOrganization: vi.fn().mockResolvedValue(0),
    },
}));

vi.mock("@/(shared)/repositories/organization-invitation.repository", () => ({
    organizationInvitationRepository: {
        purgeByOrganization: vi.fn().mockResolvedValue(0),
        purgeByEmail: vi.fn().mockResolvedValue(0),
    },
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

const {
    deleteObjectsByPrefix,
    listObjectPaths,
    organizationOwnerSegment,
    ownerPrefix,
    putObject,
} = await import("@/(shared)/lib/storage");
const { runAccountErasure } = await import("@/(shared)/lib/account-erasure");

const SUBJECT_ID = `emu-erased-${randomUUID()}`;
const BYSTANDER_ID = `emu-bystander-${randomUUID()}`;
const HOME_SEGMENT = organizationOwnerSegment(HOME_ORGANIZATION_ID);
const OTHER_SEGMENT = organizationOwnerSegment(`emu-other-${randomUUID()}`);
const PNG_MAGIC = Buffer.from("89504e470d0a1a0a", "hex");

const objectPath = (ownerId: string) =>
    `${ownerPrefix(ownerId)}${randomUUID()}.png`;

afterAll(async () => {
    for (const owner of [
        SUBJECT_ID,
        BYSTANDER_ID,
        HOME_SEGMENT,
        OTHER_SEGMENT,
    ]) {
        await deleteObjectsByPrefix(ownerPrefix(owner));
    }
});

describe("account erasure against the storage emulator", () => {
    it("deletes every object of the data subject and of their home organization, and nobody else's", async () => {
        const bystanderObject = objectPath(BYSTANDER_ID);
        const otherOrganizationObject = objectPath(OTHER_SEGMENT);
        await putObject(objectPath(SUBJECT_ID), PNG_MAGIC, "image/png");
        await putObject(objectPath(SUBJECT_ID), PNG_MAGIC, "image/png");
        await putObject(objectPath(HOME_SEGMENT), PNG_MAGIC, "image/png");
        await putObject(bystanderObject, PNG_MAGIC, "image/png");
        await putObject(otherOrganizationObject, PNG_MAGIC, "image/png");

        const report = await runAccountErasure({
            profile: { id: SUBJECT_ID, type: UserType.COMMON } as UserDTO,
            uid: `emu-uid-${randomUUID()}`,
            email: null,
            requestId: null,
        });

        expect(report.find((step) => step.step === "storage")).toEqual({
            step: "storage",
            status: "done",
            count: 3,
        });
        expect(await listObjectPaths(ownerPrefix(SUBJECT_ID))).toEqual([]);
        expect(await listObjectPaths(ownerPrefix(HOME_SEGMENT))).toEqual([]);
        expect(await listObjectPaths(ownerPrefix(BYSTANDER_ID))).toEqual([
            bystanderObject,
        ]);
        expect(await listObjectPaths(ownerPrefix(OTHER_SEGMENT))).toEqual([
            otherOrganizationObject,
        ]);
    });
});
