import type { AuditEventDTO } from "@repo/sdk/src/types";
import type { Query } from "firebase-admin/firestore";
import db from "../infra/database";
import { auditEventMapper } from "../mappers/audit-event.mapper";
import {
    BaseRepository,
    type CreateRequest,
    type PageRequest,
    type RepositoryPage,
} from "./base.repository";

/** gRPC ALREADY_EXISTS, the status Firestore uses when `create()` hits a taken id. */
const ALREADY_EXISTS = 6;

export class AuditEventImmutableError extends Error {
    constructor() {
        super("Audit events are append-only");
        this.name = "AuditEventImmutableError";
    }
}

export type AuditEventFilters = {
    userId?: string;
    from?: Date;
    to?: Date;
};

/**
 * The collection is append-only, so nothing ever sets `deletedAt` and the listing does not
 * filter on it — a column that is always `null` would only widen every composite index.
 */
class AuditEventRepository extends BaseRepository<AuditEventDTO> {
    constructor() {
        super(db, "auditEvent", auditEventMapper);
    }

    append(data: CreateRequest<AuditEventDTO>): Promise<AuditEventDTO> {
        return super.create(data);
    }

    /**
     * Writes under a caller-chosen id and reports whether it was the one who wrote it.
     * `create()` refuses a taken id, which is what keeps a repeated event to a single
     * document without a transaction or shared state.
     */
    async appendOnce(
        id: string,
        data: CreateRequest<AuditEventDTO>
    ): Promise<boolean> {
        try {
            await this.db
                .collection(this.table)
                .doc(id)
                .create({
                    ...data,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    deletedAt: null,
                });
            return true;
        } catch (error) {
            if ((error as { code?: number }).code === ALREADY_EXISTS) {
                return false;
            }
            throw error;
        }
    }

    listPage(
        filters: AuditEventFilters,
        page: PageRequest
    ): Promise<RepositoryPage<AuditEventDTO>> {
        let query: Query = this.db.collection(this.table);

        if (filters.userId) {
            query = query.where(
                "involvedUserIds",
                "array-contains",
                filters.userId
            );
        }
        if (filters.from) {
            query = query.where("createdAt", ">=", filters.from);
        }
        if (filters.to) {
            query = query.where("createdAt", "<=", filters.to);
        }

        return this.paginate(query, page);
    }

    update(): Promise<string> {
        throw new AuditEventImmutableError();
    }

    updateBulk(): Promise<string[]> {
        throw new AuditEventImmutableError();
    }

    delete(): Promise<void> {
        throw new AuditEventImmutableError();
    }

    deleteBulk(): Promise<void> {
        throw new AuditEventImmutableError();
    }
}

export const auditEventRepository = new AuditEventRepository();
