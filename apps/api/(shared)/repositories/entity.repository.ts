import type { EntityDTO } from "@repo/sdk/src/types";
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
}

export const entityRepository = new EntityRepository();
