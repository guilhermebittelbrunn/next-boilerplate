import type { WriteBatch } from "firebase-admin/firestore";
import db from "../infra/database";
import { BaseRepository } from "./base.repository";

/**
 * The document holds no data of its own yet, only who owns it, so it never leaves the API
 * as a DTO and needs no mapper.
 */
export type OrganizationRecord = {
    id: string;
    ownerUserId: string;
};

class OrganizationRepository extends BaseRepository<OrganizationRecord> {
    constructor() {
        super(db, "organization");
    }

    /**
     * The home organization a person starts with, plus any whose ownership was handed to
     * them, oldest first. A single-field query, with the soft-delete filter in memory, so
     * no composite index is needed.
     */
    async listOwnedBy(profileId: string): Promise<OrganizationRecord[]> {
        const snapshot = await this.db
            .collection(this.table)
            .where("ownerUserId", "==", profileId)
            .get();

        return snapshot.docs
            .filter((docSnap) => docSnap.data().deletedAt == null)
            .sort((a, b) => a.createTime.toMillis() - b.createTime.toMillis())
            .map((docSnap) => ({
                id: docSnap.id,
                ownerUserId: String(docSnap.data().ownerUserId),
            }));
    }

    /** The organization a person returns to when they leave someone else's: the oldest they own. */
    async findOwnedBy(profileId: string): Promise<OrganizationRecord | null> {
        return (await this.listOwnedBy(profileId))[0] ?? null;
    }

    /**
     * Staged in a batch the caller commits, so an organization never lands without the
     * membership of its owner.
     */
    stageCreation(batch: WriteBatch, ownerUserId: string, at: Date): string {
        const ref = this.db.collection(this.table).doc();
        batch.create(ref, {
            ownerUserId,
            createdAt: at,
            updatedAt: at,
            deletedAt: null,
        });
        return ref.id;
    }

    purgeById(id: string): Promise<void> {
        return this.purge(id);
    }
}

export const organizationRepository = new OrganizationRepository();
