import type { DocumentSnapshot, Query } from "firebase-admin/firestore";
import db from "../infra/database";
import { isAlreadyExistsError } from "../infra/firestore-errors";
import {
    type OrganizationMemberRecord,
    organizationMemberMapper,
} from "../mappers/organization-member.mapper";
import { BaseRepository } from "./base.repository";
import { organizationRepository } from "./organization.repository";

/**
 * A transaction reads through document references, not through the other repositories,
 * so the ownership transfer names the collections it has to check on its own.
 */
const ORGANIZATION_COLLECTION = "organization";
const USER_COLLECTION = "user";

export type OwnerMembershipInput = {
    userId: string;
    /** The home organization to rejoin, or `null` to create one in the same batch. */
    organizationId: string | null;
};

export type RemoveMembershipOutcome = "removed" | "not-member" | "owner";

export type TransferOwnershipInput = {
    organizationId: string;
    fromUserId: string;
    toUserId: string;
    now: Date;
};

export type TransferOwnershipOutcome =
    | { status: "transferred"; targetReferenceId: string | null }
    | { status: "forbidden" }
    | { status: "not-member" }
    | { status: "target-archived" };

function isLive(snapshot: DocumentSnapshot): boolean {
    return snapshot.exists && snapshot.get("deletedAt") == null;
}

function stringOrNull(value: unknown): string | null {
    return typeof value === "string" && value.length > 0 ? value : null;
}

class OrganizationMemberRepository extends BaseRepository<OrganizationMemberRecord> {
    constructor() {
        super(db, "organizationMember", organizationMemberMapper);
    }

    private ofOrganization(organizationId: string): Query {
        return this.db
            .collection(this.table)
            .where("organizationId", "==", organizationId);
    }

    findByUserId(profileId: string): Promise<OrganizationMemberRecord | null> {
        return this.findById(profileId);
    }

    /**
     * `create()` on every document of the batch, never `set()`: two first requests racing
     * would otherwise both land, the second overwriting the membership and leaving an
     * organization nobody belongs to. The loser gets `null` and reads what the winner wrote.
     */
    async createOwnerMembership(
        input: OwnerMembershipInput,
        at: Date = new Date()
    ): Promise<OrganizationMemberRecord | null> {
        const batch = this.db.batch();
        const organizationId =
            input.organizationId ??
            organizationRepository.stageCreation(batch, input.userId, at);

        const document = {
            organizationId,
            userId: input.userId,
            role: "owner",
            joinedAt: at,
            legacyClaimPending: true,
            createdAt: at,
            updatedAt: at,
            deletedAt: null,
        };
        batch.create(
            this.db.collection(this.table).doc(input.userId),
            document
        );

        try {
            await batch.commit();
        } catch (error) {
            if (isAlreadyExistsError(error)) {
                return null;
            }
            throw error;
        }

        return this.toDTO(input.userId, document);
    }

    async clearLegacyClaim(profileId: string): Promise<void> {
        await this.db
            .collection(this.table)
            .doc(profileId)
            .update({ legacyClaimPending: false });
    }

    /** Single-field query; an organization holds a handful of people, so no page is needed. */
    async listByOrganization(
        organizationId: string
    ): Promise<OrganizationMemberRecord[]> {
        const snapshot = await this.ofOrganization(organizationId).get();
        return snapshot.docs
            .filter((docSnap) => docSnap.data().deletedAt == null)
            .map((docSnap) =>
                this.toDTO(
                    docSnap.id,
                    docSnap.data() as Record<string, unknown>
                )
            );
    }

    async findInOrganization(
        profileId: string,
        organizationId: string
    ): Promise<OrganizationMemberRecord | null> {
        const membership = await this.findById(profileId);
        return membership && membership.organizationId === organizationId
            ? membership
            : null;
    }

    /**
     * Removed for good rather than soft-deleted: the resolver recreates the membership with
     * `create()`, which a document left in place would refuse forever. Read and deleted in
     * one transaction, so a person who moved to another organization since the caller
     * looked is not taken out of that one, and a person who became the owner since then
     * is not removed: the organization would be left with nobody to manage it.
     */
    remove(
        profileId: string,
        organizationId: string
    ): Promise<RemoveMembershipOutcome> {
        const ref = this.db.collection(this.table).doc(profileId);

        return this.db.runTransaction(async (tx) => {
            const current = await tx.get(ref);
            if (current.get("organizationId") !== organizationId) {
                return "not-member";
            }
            if (current.get("role") === "owner") {
                return "owner";
            }
            tx.delete(ref);
            return "removed";
        });
    }

    /**
     * Swaps the owner of the organization and both roles in one transaction, with every
     * document read before the first write. Two transfers racing from the same owner end
     * with one owner: the second rereads the first one's writes and is no longer allowed.
     * Refusals come in order of authority, then target, so whoever stopped being the owner
     * learns nothing about the person they named.
     */
    transferOwnership(
        input: TransferOwnershipInput
    ): Promise<TransferOwnershipOutcome> {
        const organizationRef = this.db
            .collection(ORGANIZATION_COLLECTION)
            .doc(input.organizationId);
        const fromRef = this.db.collection(this.table).doc(input.fromUserId);
        const toRef = this.db.collection(this.table).doc(input.toUserId);
        const targetProfileRef = this.db
            .collection(USER_COLLECTION)
            .doc(input.toUserId);

        return this.db.runTransaction(
            async (tx): Promise<TransferOwnershipOutcome> => {
                const [organization, from, to, targetProfile] = await tx.getAll(
                    organizationRef,
                    fromRef,
                    toRef,
                    targetProfileRef
                );

                const stillOwner =
                    isLive(organization) &&
                    organization.get("ownerUserId") === input.fromUserId &&
                    isLive(from) &&
                    from.get("organizationId") === input.organizationId &&
                    from.get("role") === "owner";
                if (!stillOwner) {
                    return { status: "forbidden" };
                }

                if (
                    !(
                        isLive(to) &&
                        to.get("organizationId") === input.organizationId
                    )
                ) {
                    return { status: "not-member" };
                }
                if (!isLive(targetProfile)) {
                    return { status: "target-archived" };
                }

                tx.update(organizationRef, {
                    ownerUserId: input.toUserId,
                    updatedAt: input.now,
                });
                tx.update(fromRef, { role: "member", updatedAt: input.now });
                tx.update(toRef, { role: "owner", updatedAt: input.now });

                return {
                    status: "transferred",
                    targetReferenceId: stringOrNull(
                        targetProfile.get("reference_id")
                    ),
                };
            }
        );
    }

    purgeByOrganization(organizationId: string): Promise<number> {
        return this.purgeAll(this.ofOrganization(organizationId));
    }
}

export const organizationMemberRepository = new OrganizationMemberRepository();
