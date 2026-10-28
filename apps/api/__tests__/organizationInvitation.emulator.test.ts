import { createHash, randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { getFirestoreAdmin } = await import("@repo/auth/server");
const { resolveOrganizationMembership } = await import(
    "@/(shared)/lib/organization-membership"
);
const { organizationInvitationRepository } = await import(
    "@/(shared)/repositories/organization-invitation.repository"
);

const RUN_ID = randomUUID();
const usedProfileIds: string[] = [];
const usedOrganizationIds: string[] = [];

const DAY_MS = 86_400_000;
const PENDING_MAX = 20;

const newProfileId = (label: string) => {
    const profileId = `emu-inv-${label}-${RUN_ID}`;
    usedProfileIds.push(profileId);
    return profileId;
};

const sha256 = (value: string) =>
    createHash("sha256").update(value).digest("hex");

const db = () => getFirestoreAdmin();

/**
 * The acceptance only lets in an organization whose owner has a live profile, and only
 * counts members with one, so every person here gets a profile document first.
 */
async function seedLiveProfile(profileId: string): Promise<void> {
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
}

const archiveProfile = (profileId: string) =>
    db().collection("user").doc(profileId).update({ deletedAt: new Date() });

async function homeOf(profileId: string): Promise<string> {
    await seedLiveProfile(profileId);
    const membership = await resolveOrganizationMembership(profileId);
    usedOrganizationIds.push(membership.organizationId);
    return membership.organizationId;
}

async function invite(
    organizationId: string,
    email: string,
    invitedByUserId: string,
    now = new Date()
) {
    const token = randomUUID();
    const outcome = await organizationInvitationRepository.issue({
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
    return { token, outcome };
}

const accept = (token: string, userId: string, email: string) =>
    organizationInvitationRepository.acceptByTokenHash({
        tokenHash: sha256(token),
        userId,
        email,
        now: new Date(),
    });

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

describe("organization invitations against the Firestore emulator", () => {
    it("lets a token be used once, even under simultaneous clicks", async () => {
        const owner = newProfileId("owner");
        const invitee = newProfileId("invitee");
        const stranger = newProfileId("stranger");
        const organizationId = await homeOf(owner);
        await homeOf(invitee);
        await homeOf(stranger);
        const email = `invitee-${RUN_ID}@example.com`;
        const { token } = await invite(organizationId, email, owner);

        const outcomes = await Promise.all([
            accept(token, invitee, email),
            accept(token, stranger, email),
            accept(token, invitee, email),
        ]);

        const statuses = outcomes.map((outcome) => outcome.status);
        expect(statuses.filter((status) => status === "accepted")).toHaveLength(
            1
        );
        const members = await db()
            .collection("organizationMember")
            .where("organizationId", "==", organizationId)
            .get();
        const memberIds = members.docs.map((docSnap) => docSnap.id).sort();
        const winner = memberIds.find((id) => id !== owner);
        expect(memberIds).toHaveLength(2);
        expect([invitee, stranger]).toContain(winner);
        for (const [index, outcome] of outcomes.entries()) {
            const caller = index === 1 ? stranger : invitee;
            if (outcome.status === "accepted") {
                continue;
            }
            expect(outcome.status).toBe(
                caller === winner ? "already-accepted" : "invalid"
            );
        }
    });

    it("keeps one document per organization and address when the owner clicks twice", async () => {
        const owner = newProfileId("double-click");
        const organizationId = await homeOf(owner);
        const email = `twice-${RUN_ID}@example.com`;
        const now = new Date();

        const [first, second] = await Promise.all([
            invite(organizationId, email, owner, now),
            invite(organizationId, email, owner, now),
        ]);

        const stored = await db()
            .collection("organizationInvitation")
            .where("organizationId", "==", organizationId)
            .where("email", "==", email)
            .get();
        expect(stored.size).toBe(1);
        const issuedTokenHash = stored.docs[0]?.get("tokenHash");
        expect([sha256(first.token), sha256(second.token)]).toContain(
            issuedTokenHash
        );
    });

    it("refuses an invitation of an organization whose owner moved elsewhere", async () => {
        const dormantOwner = newProfileId("dormant-owner");
        const otherOwner = newProfileId("other-owner");
        const latecomer = newProfileId("latecomer");
        const dormantId = await homeOf(dormantOwner);
        const otherId = await homeOf(otherOwner);
        await homeOf(latecomer);
        const latecomerEmail = `latecomer-${RUN_ID}@example.com`;
        const pending = await invite(dormantId, latecomerEmail, dormantOwner);

        const ownerEmail = `dormant-owner-${RUN_ID}@example.com`;
        const move = await invite(otherId, ownerEmail, otherOwner);
        expect(
            (await accept(move.token, dormantOwner, ownerEmail)).status
        ).toBe("accepted");

        expect(
            (await accept(pending.token, latecomer, latecomerEmail)).status
        ).toBe("invalid");
    });

    it("refuses an owner who still has members", async () => {
        const busyOwner = newProfileId("busy-owner");
        const theirMember = newProfileId("their-member");
        const host = newProfileId("host");
        const busyId = await homeOf(busyOwner);
        const hostId = await homeOf(host);
        await homeOf(theirMember);
        const memberEmail = `their-member-${RUN_ID}@example.com`;
        const joining = await invite(busyId, memberEmail, busyOwner);
        expect(
            (await accept(joining.token, theirMember, memberEmail)).status
        ).toBe("accepted");

        const ownerEmail = `busy-owner-${RUN_ID}@example.com`;
        const leaving = await invite(hostId, ownerEmail, host);

        expect(
            (await accept(leaving.token, busyOwner, ownerEmail)).status
        ).toBe("owner-has-members");
    });

    it("refuses an invitation of an organization whose owner was archived", async () => {
        const archivedOwner = newProfileId("archived-owner");
        const latecomer = newProfileId("archived-latecomer");
        const organizationId = await homeOf(archivedOwner);
        await homeOf(latecomer);
        const latecomerEmail = `archived-latecomer-${RUN_ID}@example.com`;
        const pending = await invite(
            organizationId,
            latecomerEmail,
            archivedOwner
        );
        await archiveProfile(archivedOwner);

        expect(
            (await accept(pending.token, latecomer, latecomerEmail)).status
        ).toBe("invalid");
        const latecomerMembership = await db()
            .collection("organizationMember")
            .doc(latecomer)
            .get();
        expect(latecomerMembership.get("organizationId")).not.toBe(
            organizationId
        );
    });

    it("lets an owner whose only other member was archived join another team", async () => {
        const owner = newProfileId("lonely-owner");
        const archivedMember = newProfileId("lonely-archived-member");
        const host = newProfileId("lonely-host");
        const ownerHomeId = await homeOf(owner);
        const hostId = await homeOf(host);
        await homeOf(archivedMember);
        const memberEmail = `lonely-archived-member-${RUN_ID}@example.com`;
        const joining = await invite(ownerHomeId, memberEmail, owner);
        expect(
            (await accept(joining.token, archivedMember, memberEmail)).status
        ).toBe("accepted");
        await archiveProfile(archivedMember);

        const ownerEmail = `lonely-owner-${RUN_ID}@example.com`;
        const leaving = await invite(hostId, ownerEmail, host);

        expect((await accept(leaving.token, owner, ownerEmail)).status).toBe(
            "accepted"
        );
        const ownerMembership = await db()
            .collection("organizationMember")
            .doc(owner)
            .get();
        expect(ownerMembership.get("organizationId")).toBe(hostId);
    });

    it("refuses a token sent to another address", async () => {
        const owner = newProfileId("mismatch-owner");
        const someone = newProfileId("mismatch-someone");
        const organizationId = await homeOf(owner);
        await homeOf(someone);
        const { token } = await invite(
            organizationId,
            `intended-${RUN_ID}@example.com`,
            owner
        );

        expect(
            (await accept(token, someone, `other-${RUN_ID}@example.com`)).status
        ).toBe("email-mismatch");
    });
});
