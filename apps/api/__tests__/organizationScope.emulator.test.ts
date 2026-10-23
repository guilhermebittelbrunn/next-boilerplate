import { randomUUID } from "node:crypto";
import { EntityType } from "@repo/sdk/src/types";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getFirestoreAdmin } = await import("@repo/auth/server");
const { resolveOrganizationMembership } = await import(
    "@/(shared)/lib/organization-membership"
);
const { entityRepository } = await import(
    "@/(shared)/repositories/entity.repository"
);
const { organizationMemberRepository } = await import(
    "@/(shared)/repositories/organization-member.repository"
);

const RUN_ID = randomUUID();
const usedProfileIds: string[] = [];

const newProfileId = (label: string) => {
    const profileId = `emu-org-${label}-${RUN_ID}`;
    usedProfileIds.push(profileId);
    return profileId;
};

const SIMULTANEOUS_FIRST_REQUESTS = 8;
const OLD_INSTANT = new Date("2025-01-01T00:00:00.000Z");

const db = () => getFirestoreAdmin();

/** A record as it was written before organizations existed: no `organizationId` at all. */
const writeLegacyEntity = (
    userId: string,
    overrides: Record<string, unknown> = {}
) =>
    db()
        .collection("entity")
        .add({
            userId,
            name: "Legacy",
            description: "",
            type: EntityType.CUSTOMER,
            photo: null,
            genre: null,
            birthdate: null,
            enabled: true,
            createdAt: OLD_INSTANT,
            updatedAt: OLD_INSTANT,
            deletedAt: null,
            ...overrides,
        });

const createEntity = (
    organizationId: string,
    userId: string,
    type = EntityType.CUSTOMER
) =>
    entityRepository.create({
        organizationId,
        userId,
        name: `Created in ${organizationId}`,
        description: "",
        type,
        photo: null,
        genre: null,
        birthdate: null,
        enabled: true,
    });

afterAll(async () => {
    for (const profileId of usedProfileIds) {
        const [organizations, entities] = await Promise.all([
            db()
                .collection("organization")
                .where("ownerUserId", "==", profileId)
                .get(),
            db().collection("entity").where("userId", "==", profileId).get(),
        ]);
        await Promise.all([
            ...organizations.docs.map((docSnap) => docSnap.ref.delete()),
            ...entities.docs.map((docSnap) => docSnap.ref.delete()),
            db().collection("organizationMember").doc(profileId).delete(),
        ]);
    }
});

describe("the organization resolver against the Firestore emulator", () => {
    it("creates a single organization when the first requests race", async () => {
        const profileId = newProfileId("race");

        const resolved = await Promise.all(
            Array.from({ length: SIMULTANEOUS_FIRST_REQUESTS }, () =>
                resolveOrganizationMembership(profileId)
            )
        );

        const organizations = await db()
            .collection("organization")
            .where("ownerUserId", "==", profileId)
            .get();
        expect(organizations.size).toBe(1);
        expect(
            new Set(resolved.map((membership) => membership.organizationId))
        ).toEqual(new Set([organizations.docs[0]?.id]));
        expect(
            resolved.every((membership) => membership.role === "owner")
        ).toBe(true);
    });

    it("stamps the person's older records once, without touching updatedAt or anyone else's", async () => {
        const profileId = newProfileId("claim");
        const otherId = newProfileId("claim-bystander");
        const legacy = await writeLegacyEntity(profileId);
        const legacyDeleted = await writeLegacyEntity(profileId, {
            deletedAt: OLD_INSTANT,
        });
        const createdElsewhere = await writeLegacyEntity(profileId, {
            organizationId: "emu-some-other-organization",
        });
        const someoneElses = await writeLegacyEntity(otherId);

        const membership = await resolveOrganizationMembership(profileId);

        const [legacyAfter, deletedAfter, elsewhereAfter, someoneElsesAfter] =
            await Promise.all(
                [legacy, legacyDeleted, createdElsewhere, someoneElses].map(
                    (ref) => ref.get()
                )
            );
        expect(legacyAfter?.get("organizationId")).toBe(
            membership.organizationId
        );
        expect(legacyAfter?.get("updatedAt").toDate()).toEqual(OLD_INSTANT);
        expect(deletedAfter?.get("organizationId")).toBe(
            membership.organizationId
        );
        expect(elsewhereAfter?.get("organizationId")).toBe(
            "emu-some-other-organization"
        );
        expect(someoneElsesAfter?.get("organizationId")).toBeUndefined();

        const stored = await db()
            .collection("organizationMember")
            .doc(profileId)
            .get();
        expect(stored.get("legacyClaimPending")).toBe(false);
        expect(
            await entityRepository.claimUnscopedByUserId(
                profileId,
                membership.organizationId
            )
        ).toBe("finished");
    });

    /** Firestore does not match an absent field against `null`. */
    it("never reaches an unstamped record through an organization", async () => {
        const profileId = newProfileId("unstamped");
        const legacy = await writeLegacyEntity(profileId);

        expect(await entityRepository.findInOrganization(legacy.id, "")).toBe(
            null
        );
        const page = await entityRepository.listByOrganization("", {
            limit: 20,
            cursorId: null,
        });
        expect(page.items.map((row) => row.id)).not.toContain(legacy.id);
    });
});

describe("entity scope against the Firestore emulator", () => {
    it("keeps two organizations apart in list, summary and read by id", async () => {
        const ownerA = newProfileId("owner-a");
        const memberOfA = newProfileId("member-a");
        const ownerB = newProfileId("owner-b");
        const organizationA = `emu-org-a-${RUN_ID}`;
        const organizationB = `emu-org-b-${RUN_ID}`;

        const byOwnerA = await createEntity(organizationA, ownerA);
        const byMemberOfA = await createEntity(
            organizationA,
            memberOfA,
            EntityType.FRANCHISE
        );
        const deletedInA = await createEntity(organizationA, ownerA);
        await entityRepository.delete(deletedInA.id);
        const inB = await createEntity(organizationB, ownerB);

        const pageA = await entityRepository.listByOrganization(organizationA, {
            limit: 20,
            cursorId: null,
        });
        expect(pageA.items.map((row) => row.id).sort()).toEqual(
            [byOwnerA.id, byMemberOfA.id].sort()
        );

        const summaryA =
            await entityRepository.summaryByOrganization(organizationA);
        expect(summaryA.total).toBe(2);
        expect(summaryA.byType.franchise).toBe(1);

        expect(
            await entityRepository.findInOrganization(inB.id, organizationA)
        ).toBeNull();
        expect(
            await entityRepository.findInOrganization(
                deletedInA.id,
                organizationA
            )
        ).toBeNull();
        expect(
            (
                await entityRepository.findInOrganization(
                    byMemberOfA.id,
                    organizationA
                )
            )?.userId
        ).toBe(memberOfA);
    });
});

describe("membership removal against the Firestore emulator", () => {
    it("leaves a membership that points at another organization and sends a removed member back home", async () => {
        const ownerId = newProfileId("removal-owner");
        const memberId = newProfileId("removal-member");
        const owner = await resolveOrganizationMembership(ownerId);
        const home = await resolveOrganizationMembership(memberId);
        const joinedAt = new Date();
        await db().collection("organizationMember").doc(memberId).set({
            organizationId: owner.organizationId,
            userId: memberId,
            role: "member",
            joinedAt,
            legacyClaimPending: false,
            createdAt: joinedAt,
            updatedAt: joinedAt,
            deletedAt: null,
        });

        expect(
            await organizationMemberRepository.remove(
                memberId,
                `emu-org-elsewhere-${RUN_ID}`
            )
        ).toBe(false);
        expect(
            (
                await db().collection("organizationMember").doc(memberId).get()
            ).get("organizationId")
        ).toBe(owner.organizationId);

        expect(
            await organizationMemberRepository.remove(
                memberId,
                owner.organizationId
            )
        ).toBe(true);
        expect(
            (await db().collection("organizationMember").doc(memberId).get())
                .exists
        ).toBe(false);

        const back = await resolveOrganizationMembership(memberId);
        expect(back).toMatchObject({
            organizationId: home.organizationId,
            role: "owner",
        });
        const homes = await db()
            .collection("organization")
            .where("ownerUserId", "==", memberId)
            .get();
        expect(homes.size).toBe(1);
    });
});
