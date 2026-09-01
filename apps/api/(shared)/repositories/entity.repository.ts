import type { EntityDTO } from "@repo/sdk/src/types";
import db from "../infra/database";
import { entityMapper } from "../mappers/entity.mapper";
import { BaseRepository } from "./base.repository";

class EntityRepository extends BaseRepository<EntityDTO> {
    constructor() {
        super(db, "entity", entityMapper);
    }

    async listByUserId(userId: string): Promise<EntityDTO[]> {
        const snapshot = await this.db
            .collection(this.table)
            .where("userId", "==", userId)
            .get();

        const rows = snapshot.docs
            .map((docSnap) => {
                const data = docSnap.data() as Record<string, unknown>;
                if (data.deletedAt != null) {
                    return null;
                }
                return this.rowMapper?.toDTO(this.toEntity(docSnap.id, data));
            })
            .filter((row): row is EntityDTO => row != null);

        return [...rows].sort((a, b) => {
            const aTime = new Date(a.createdAt).getTime();
            const bTime = new Date(b.createdAt).getTime();
            return bTime - aTime;
        });
    }
}

export const entityRepository = new EntityRepository();
