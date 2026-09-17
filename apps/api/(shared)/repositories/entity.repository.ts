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
