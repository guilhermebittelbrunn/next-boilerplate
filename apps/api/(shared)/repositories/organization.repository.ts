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
     * Every common profile owns exactly one organization, its home: the one it returns to
     * when it leaves someone else's. A single-field query, with the soft-delete filter in
     * memory, so no composite index is needed.
     */
    async findOwnedBy(profileId: string): Promise<OrganizationRecord | null> {
        const snapshot = await this.db
            .collection(this.table)
            .where("ownerUserId", "==", profileId)
            .get();

        const live = snapshot.docs.find(
            (docSnap) => docSnap.data().deletedAt == null
        );

        return live
            ? { id: live.id, ownerUserId: String(live.data().ownerUserId) }
            : null;
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
