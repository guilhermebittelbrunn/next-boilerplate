import type { EntityDTO, EntitySummaryDTO } from "@repo/sdk/src/types";
import { EntityType } from "@repo/sdk/src/types";
import type {
    DocumentSnapshot,
    Query,
    WriteBatch,
} from "firebase-admin/firestore";
import db from "../infra/database";
import { entityMapper } from "../mappers/entity.mapper";
import {
    BaseRepository,
    type PageRequest,
    type RepositoryPage,
} from "./base.repository";

/** Firestore refuses a batch with more than 500 writes. */
const WRITE_BATCH_SIZE = 500;
/**
 * Bounds one request at 50k stamped records, a hundred batches. What is left over is
 * picked up by the next request, which beats a sign-in that never returns.
 */
const LEGACY_CLAIM_MAX_RECORDS = 50_000;

/**
 * A record written before organizations existed has no `organizationId` at all, and an
 * absent field does not match an equality filter on `null`: the check has to run on the
 * documents themselves.
 */
const isUnscoped = (docSnap: DocumentSnapshot): boolean => {
    const organizationId = docSnap.get("organizationId");
    return typeof organizationId !== "string" || organizationId === "";
};

class EntityRepository extends BaseRepository<EntityDTO> {
    constructor() {
        super(db, "entity", entityMapper);
    }

    /** The one place that decides which records an organization can reach. */
    private inOrganization(organizationId: string): Query {
        return this.db
            .collection(this.table)
            .where("organizationId", "==", organizationId);
    }

    /**
     * `null` for a record of another organization, a soft-deleted one, or one not stamped
     * yet. The empty id is refused explicitly: an unstamped record maps to an empty
     * `organizationId`, and comparing two empty strings would hand it to the caller.
     */
    async findInOrganization(
        id: string,
        organizationId: string
    ): Promise<EntityDTO | null> {
        if (!organizationId) {
            return null;
        }
        const row = await this.findById(id);
        return row && row.organizationId === organizationId ? row : null;
    }

    listByOrganization(
        organizationId: string,
        page: PageRequest
    ): Promise<RepositoryPage<EntityDTO>> {
        return this.paginate(
            this.inOrganization(organizationId).where("deletedAt", "==", null),
            page
        );
    }

    async summaryByOrganization(
        organizationId: string
    ): Promise<EntitySummaryDTO> {
        const scoped = () =>
            this.inOrganization(organizationId).where("deletedAt", "==", null);

        const [total, enabled, franchise, customer, collaborator] =
            await Promise.all([
                this.countQuery(scoped()),
                this.countQuery(scoped().where("enabled", "==", true)),
                this.countQuery(
                    scoped().where("type", "==", EntityType.FRANCHISE)
                ),
                this.countQuery(
                    scoped().where("type", "==", EntityType.CUSTOMER)
                ),
                this.countQuery(
                    scoped().where("type", "==", EntityType.COLLABORATOR)
                ),
            ]);

        return {
            total,
            enabled,
            byType: { franchise, customer, collaborator },
        };
    }

    /**
     * No `deletedAt` filter on purpose: a soft-deleted record is still the organization's
     * data, whoever created it.
     */
    purgeByOrganization(organizationId: string): Promise<number> {
        return this.purgeAll(this.inOrganization(organizationId));
    }

    /**
     * Every record the person created, in any organization and soft-deleted ones included,
     * in a single equality query so no composite index is needed. Reads one over the cap
     * to tell a full page apart from a truncated one.
     */
    async findAllByUserId(
        userId: string,
        limit: number
    ): Promise<{ items: EntityDTO[]; truncated: boolean }> {
        const snapshot = await this.db
            .collection(this.table)
            .where("userId", "==", userId)
            .limit(limit + 1)
            .get();

        const truncated = snapshot.docs.length > limit;
        const docs = truncated ? snapshot.docs.slice(0, limit) : snapshot.docs;

        return {
            items: docs.map((docSnap) =>
                this.toDTO(
                    docSnap.id,
                    docSnap.data() as Record<string, unknown>
                )
            ),
            truncated,
        };
    }

    /**
     * Projected and unordered, so the query needs no composite index: a missing index here
     * would leave the migration failing silently on every request.
     */
    private async findUnscopedByUserId(
        userId: string
    ): Promise<DocumentSnapshot[]> {
        const snapshot = await this.db
            .collection(this.table)
            .where("userId", "==", userId)
            .select("organizationId")
            .get();
        return snapshot.docs.filter(isUnscoped);
    }

    private async writeInBatches(
        docs: DocumentSnapshot[],
        write: (batch: WriteBatch, docSnap: DocumentSnapshot) => void
    ): Promise<void> {
        for (let start = 0; start < docs.length; start += WRITE_BATCH_SIZE) {
            const batch = this.db.batch();
            for (const docSnap of docs.slice(start, start + WRITE_BATCH_SIZE)) {
                write(batch, docSnap);
            }
            await batch.commit();
        }
    }

    /**
     * Moves the person's records from before organizations into their home organization.
     * `updatedAt` is left alone: a migration is not an edit. Records already stamped, which
     * includes everything the person created as a member elsewhere, are not touched.
     */
    async claimUnscopedByUserId(
        userId: string,
        organizationId: string
    ): Promise<"finished" | "unfinished"> {
        const unscoped = await this.findUnscopedByUserId(userId);
        const claimable = unscoped.slice(0, LEGACY_CLAIM_MAX_RECORDS);

        await this.writeInBatches(claimable, (batch, docSnap) =>
            batch.update(docSnap.ref, { organizationId })
        );

        return unscoped.length > claimable.length ? "unfinished" : "finished";
    }

    /** What a person left unstamped belongs to nobody else, so their erasure takes it. */
    async purgeUnscopedByUserId(userId: string): Promise<number> {
        const unscoped = await this.findUnscopedByUserId(userId);

        await this.writeInBatches(unscoped, (batch, docSnap) =>
            batch.delete(docSnap.ref)
        );

        return unscoped.length;
    }
}

export const entityRepository = new EntityRepository();
