import { createHash, randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getFirestoreAdmin } = await import("@repo/auth/server");
const { ownsOrganizationWithMembers, resolveOrganizationMembership } =
    await import("@/(shared)/lib/organization-membership");
const { organizationRepository } = await import(
    "@/(shared)/repositories/organization.repository"
);
const { organizationMemberRepository } = await import(
    "@/(shared)/repositories/organization-member.repository"
);
const { organizationInvitationRepository } = await import(
    "@/(shared)/repositories/organization-invitation.repository"
);

const RUN_ID = randomUUID();
const usedProfileIds: string[] = [];
const usedOrganizationIds: string[] = [];

const DAY_MS = 86_400_000;
const PENDING_MAX = 20;

const sha256 = (value: string) =>
    createHash("sha256").update(value).digest("hex");

const db = () => getFirestoreAdmin();

async function livePerson(label: string): Promise<string> {
    const profileId = `emu-own-${label}-${RUN_ID}`;
    usedProfileIds.push(profileId);
    const now = new Date();
    await db()
        .collection("user")
        .doc(profileId)
        .set({
            reference_id: `uid-${profileId}`,
            type: "common",
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
        });
    return profileId;
}

const archiveProfile = (profileId: string) =>
    db().collection("user").doc(profileId).update({ deletedAt: new Date() });

async function homeOf(profileId: string): Promise<string> {
    const membership = await resolveOrganizationMembership(profileId);
    usedOrganizationIds.push(membership.organizationId);
    return membership.organizationId;
}

async function join(
    organizationId: string,
    profileId: string,
    invitedByUserId: string
): Promise<void> {
    const email = `${profileId}@example.com`;
    const token = randomUUID();
    const now = new Date();
    await organizationInvitationRepository.issue({
        id: sha256(`${organizationId}:${email}`),
        organizationId,
        email,
        inviterEmail: null,
        invitedByUserId,
        tokenHash: sha256(token),
        now,
        expiresAt: new Date(now.getTime() + DAY_MS),
        resendNotBefore: new Date(now.getTime() - DAY_MS),
        pendingMax: PENDING_MAX,
    });
    const outcome = await organizationInvitationRepository.acceptByTokenHash({
        tokenHash: sha256(token),
        userId: profileId,
        email,
        now: new Date(),
    });
    if (outcome.status !== "accepted") {
        throw new Error(`Joining the team answered ${outcome.status}`);
    }
}

/** An owner with a team of the given people, each one already a member. */
async function teamOf(ownerLabel: string, ...memberLabels: string[]) {
    const owner = await livePerson(ownerLabel);
    const organizationId = await homeOf(owner);
    const members: string[] = [];
    for (const label of memberLabels) {
        const member = await livePerson(label);
        await homeOf(member);
        await join(organizationId, member, owner);
        members.push(member);
    }
    return { owner, organizationId, members };
}

const transfer = (organizationId: string, from: string, to: string) =>
    organizationMemberRepository.transferOwnership({
        organizationId,
        fromUserId: from,
        toUserId: to,
        now: new Date(),
    });

async function ownersOf(organizationId: string) {
    const [organization, members] = await Promise.all([
        db().collection("organization").doc(organizationId).get(),
        db()
            .collection("organizationMember")
            .where("organizationId", "==", organizationId)
            .get(),
    ]);
    return {
        ownerUserId: organization.get("ownerUserId") as string,
        ownerMemberships: members.docs
            .filter((docSnap) => docSnap.get("role") === "owner")
            .map((docSnap) => docSnap.id),
    };
}

afterAll(async () => {
    const deletions: Promise<unknown>[] = [];
    for (const organizationId of usedOrganizationIds) {
        const invitations = await db()
            .collection("organizationInvitation")
            .where("organizationId", "==", organizationId)
            .get();
        deletions.push(
            ...invitations.docs.map((docSnap) => docSnap.ref.delete()),
            db().collection("organization").doc(organizationId).delete()
        );
    }
    for (const profileId of usedProfileIds) {
        deletions.push(
            db().collection("organizationMember").doc(profileId).delete(),
            db().collection("user").doc(profileId).delete()
        );
    }
    await Promise.all(deletions);
});

describe("organization ownership transfer against the Firestore emulator", () => {
    it("swaps the owner of the organization and both roles in one go", async () => {
        const { owner, organizationId, members } = await teamOf(
            "happy-owner",
            "happy-member"
        );
        const [member] = members as [string];
        const before = new Date();

        const outcome = await transfer(organizationId, owner, member);

        expect(outcome).toEqual({
            status: "transferred",
            targetReferenceId: `uid-${member}`,
        });
        const organization = await db()
            .collection("organization")
            .doc(organizationId)
            .get();
        expect(organization.get("ownerUserId")).toBe(member);
        expect(
            organization.get("updatedAt").toDate().getTime()
        ).toBeGreaterThanOrEqual(before.getTime());
        const [previous, next] = await Promise.all([
            db().collection("organizationMember").doc(owner).get(),
            db().collection("organizationMember").doc(member).get(),
        ]);
        expect(previous.get("role")).toBe("member");
        expect(previous.get("organizationId")).toBe(organizationId);
        expect(next.get("role")).toBe("owner");
        expect(next.get("organizationId")).toBe(organizationId);
        expect(next.get("legacyClaimPending")).toBe(false);
    });

    it("ends two simultaneous transfers with exactly one owner", async () => {
        const { owner, organizationId, members } = await teamOf(
            "race-owner",
            "race-b",
            "race-c"
        );
        const [memberB, memberC] = members as [string, string];

        const outcomes = await Promise.all([
            transfer(organizationId, owner, memberB),
            transfer(organizationId, owner, memberC),
        ]);

        const statuses = outcomes.map((outcome) => outcome.status).sort();
        expect(statuses).toEqual(["forbidden", "transferred"]);
        const { ownerUserId, ownerMemberships } =
            await ownersOf(organizationId);
        expect(ownerMemberships).toEqual([ownerUserId]);
        expect([memberB, memberC]).toContain(ownerUserId);
    });

    it("keeps one owner when the target is removed while the transfer runs", async () => {
        const { owner, organizationId, members } = await teamOf(
            "remove-owner",
            "remove-target"
        );
        const [target] = members as [string];

        const [transferred, removed] = await Promise.all([
            transfer(organizationId, owner, target),
            organizationMemberRepository.remove(target, organizationId),
        ]);

        if (transferred.status === "transferred") {
            expect(removed).toBe("owner");
        } else {
            expect(transferred.status).toBe("not-member");
            expect(removed).toBe("removed");
        }
        const { ownerUserId, ownerMemberships } =
            await ownersOf(organizationId);
        expect(ownerMemberships).toEqual([ownerUserId]);
    });

    it("keeps one owner when the target accepts another team while the transfer runs", async () => {
        const { owner, organizationId, members } = await teamOf(
            "move-owner",
            "move-target"
        );
        const [target] = members as [string];
        const host = await livePerson("move-host");
        const hostId = await homeOf(host);
        const email = `${target}-elsewhere@example.com`;
        const token = randomUUID();
        const now = new Date();
        await organizationInvitationRepository.issue({
            id: sha256(`${hostId}:${email}`),
            organizationId: hostId,
            email,
            inviterEmail: null,
            invitedByUserId: host,
            tokenHash: sha256(token),
            now,
            expiresAt: new Date(now.getTime() + DAY_MS),
            resendNotBefore: new Date(now.getTime() - DAY_MS),
            pendingMax: PENDING_MAX,
        });

        const [transferred, accepted] = await Promise.all([
            transfer(organizationId, owner, target),
            organizationInvitationRepository.acceptByTokenHash({
                tokenHash: sha256(token),
                userId: target,
                email,
                now: new Date(),
            }),
        ]);

        const membership = await db()
            .collection("organizationMember")
            .doc(target)
            .get();
        if (transferred.status === "transferred") {
            expect(accepted.status).toBe("owner-has-members");
            expect(membership.get("organizationId")).toBe(organizationId);
        } else {
            expect(transferred.status).toBe("not-member");
            expect(accepted.status).toBe("accepted");
            expect(membership.get("organizationId")).toBe(hostId);
        }
        const { ownerUserId, ownerMemberships } =
            await ownersOf(organizationId);
        expect(ownerMemberships).toEqual([ownerUserId]);
    });

    it("frees the previous owner and leaves the new one owning two organizations", async () => {
        const newOwner = await livePerson("two-new-owner");
        const newOwnerHomeId = await homeOf(newOwner);
        const previousOwner = await livePerson("two-previous-owner");
        const teamId = await homeOf(previousOwner);
        await join(teamId, newOwner, previousOwner);

        expect((await transfer(teamId, previousOwner, newOwner)).status).toBe(
            "transferred"
        );

        expect(await ownsOrganizationWithMembers(previousOwner)).toBe(false);
        expect(await ownsOrganizationWithMembers(newOwner)).toBe(true);
        expect(
            (await organizationRepository.listOwnedBy(newOwner)).map(
                ({ id }) => id
            )
        ).toEqual([newOwnerHomeId, teamId]);
        expect(await organizationRepository.listOwnedBy(previousOwner)).toEqual(
            []
        );

        expect(
            await organizationMemberRepository.remove(previousOwner, teamId)
        ).toBe("removed");
        const fresh = await resolveOrganizationMembership(previousOwner);
        usedOrganizationIds.push(fresh.organizationId);
        expect(fresh.role).toBe("owner");
        expect(fresh.organizationId).not.toBe(teamId);
        expect(fresh.organizationId).not.toBe(newOwnerHomeId);
        expect(await ownsOrganizationWithMembers(newOwner)).toBe(false);
    });

    it("refuses a target whose profile was archived and writes nothing", async () => {
        const { owner, organizationId, members } = await teamOf(
            "archived-owner",
            "archived-target"
        );
        const [target] = members as [string];
        await archiveProfile(target);

        expect(await transfer(organizationId, owner, target)).toEqual({
            status: "target-archived",
        });
        const { ownerUserId, ownerMemberships } =
            await ownersOf(organizationId);
        expect(ownerUserId).toBe(owner);
        expect(ownerMemberships).toEqual([owner]);
        const targetMembership = await db()
            .collection("organizationMember")
            .doc(target)
            .get();
        expect(targetMembership.get("role")).toBe("member");
    });

    it("refuses a target from another organization as not a member", async () => {
        const { owner, organizationId } = await teamOf("outsider-owner");
        const outsider = await livePerson("outsider");
        await homeOf(outsider);

        expect(await transfer(organizationId, owner, outsider)).toEqual({
            status: "not-member",
        });
        expect((await ownersOf(organizationId)).ownerUserId).toBe(owner);
    });
});
