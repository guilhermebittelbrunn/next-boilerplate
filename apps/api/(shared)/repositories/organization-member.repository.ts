import type { Query } from "firebase-admin/firestore";
import db from "../infra/database";
import { isAlreadyExistsError } from "../infra/firestore-errors";
import {
    type OrganizationMemberRecord,
    organizationMemberMapper,
} from "../mappers/organization-member.mapper";
import { BaseRepository } from "./base.repository";
import { organizationRepository } from "./organization.repository";

export type OwnerMembershipInput = {
    userId: string;
    /** The home organization to rejoin, or `null` to create one in the same batch. */
    organizationId: string | null;
};

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
     * looked is not taken out of that one. `false` when the membership was elsewhere.
     */
    remove(profileId: string, organizationId: string): Promise<boolean> {
        const ref = this.db.collection(this.table).doc(profileId);

        return this.db.runTransaction(async (tx) => {
            const current = await tx.get(ref);
            if (current.get("organizationId") !== organizationId) {
                return false;
            }
            tx.delete(ref);
            return true;
        });
    }

    purgeByOrganization(organizationId: string): Promise<number> {
        return this.purgeAll(this.ofOrganization(organizationId));
    }
}

export const organizationMemberRepository = new OrganizationMemberRepository();
