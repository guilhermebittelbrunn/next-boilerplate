import type { EntityDTO, EntitySummaryDTO } from "@repo/sdk/src/types";
import { EntityType } from "@repo/sdk/src/types";
import db from "../infra/database";
import { entityMapper } from "../mappers/entity.mapper";
import {
    BaseRepository,
    type PageRequest,
    type RepositoryPage,
} from "./base.repository";

class EntityRepository extends BaseRepository<EntityDTO> {
    constructor() {
        super(db, "entity", entityMapper);
    }

    listByUserId(
        userId: string,
        page: PageRequest
    ): Promise<RepositoryPage<EntityDTO>> {
        return this.paginate(
            this.db
                .collection(this.table)
                .where("userId", "==", userId)
                .where("deletedAt", "==", null),
            page
        );
    }

    /**
     * Every record of the owner, soft-deleted ones included, in a single equality query so
     * no composite index is needed. Reads one over the cap to tell a full page apart from
     * a truncated one.
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
     * No `deletedAt` filter on purpose: a soft-deleted record holds the same data about
     * its owner as an active one.
     */
    purgeAllByUserId(userId: string): Promise<number> {
        return this.purgeAll(
            this.db.collection(this.table).where("userId", "==", userId)
        );
    }

    async summaryByUserId(userId: string): Promise<EntitySummaryDTO> {
        const scoped = () =>
            this.db
                .collection(this.table)
                .where("userId", "==", userId)
                .where("deletedAt", "==", null);

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
}

export const entityRepository = new EntityRepository();
