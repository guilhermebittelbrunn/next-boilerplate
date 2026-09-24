import type { AuditEventDTO } from "@repo/sdk/src/types";
import {
    type DocumentData,
    FieldPath,
    type Query,
    type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
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

/** Firestore refuses a batch with more than 500 writes. */
const WRITE_BATCH_SIZE = 500;
/**
 * Bounds the anonymization sweep. A trail that keeps growing while the sweep runs would
 * otherwise page forever, and an erasure that never returns is worse than one that says
 * it did not finish.
 */
const ANONYMIZE_MAX_PASSES = 100;

export class AuditEventImmutableError extends Error {
    constructor() {
        super("Audit events are append-only");
        this.name = "AuditEventImmutableError";
    }
}

/** The sweep ran out of passes with events still to strip. */
export class AuditTrailNotAnonymizedError extends Error {
    constructor(changed: number) {
        super(`Anonymization stopped after changing ${changed} events`);
        this.name = "AuditTrailNotAnonymizedError";
    }
}

/**
 * Labels are cleared by role. An event where an operator acted on this account keeps the
 * operator's own label: that person asked for nothing.
 */
function labelPatchFor(
    row: Record<string, unknown>,
    userId: string
): DocumentData | null {
    const patch: DocumentData = {};

    if (row.actorUserId === userId && row.actorLabel != null) {
        patch.actorLabel = null;
    }
    if (row.targetUserId === userId && row.targetLabel != null) {
        patch.targetLabel = null;
    }

    return Object.keys(patch).length > 0 ? patch : null;
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

    /**
     * Every event that involves the user, in a single `array-contains` filter with no
     * ordering, which the automatic array index already serves. Reads one over the cap so
     * the caller can tell a full page from a truncated one.
     */
    async findAllByInvolvedUserId(
        userId: string,
        limit: number
    ): Promise<{ items: AuditEventDTO[]; truncated: boolean }> {
        const snapshot = await this.db
            .collection(this.table)
            .where("involvedUserIds", "array-contains", userId)
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
     * Strips the labels that name this person and answers how many events changed. It is
     * the one write this collection accepts: the trail is how the controller accounts for
     * what it did, so the event stays — with its action, its instant and its `requestId` —
     * and only the name leaves it.
     *
     * Throws when the sweep runs out of passes with events still to strip, so a partial
     * anonymization is reported as a failed step instead of counted as done.
     */
    async anonymizeUserLabels(userId: string): Promise<number> {
        // Ordering by document id is the one ordering a single-filter query gets for
        // free: every index already ends with it, so the sweep can page with a cursor
        // without a composite index. Paging is what keeps the trail off the heap — the
        // write does not change what the filter matches, so the query cannot shrink and
        // a cursor is the only way forward.
        const scoped = this.db
            .collection(this.table)
            .where("involvedUserIds", "array-contains", userId)
            .orderBy(FieldPath.documentId());

        let changed = 0;
        let cursor: QueryDocumentSnapshot | null = null;

        for (let pass = 0; pass < ANONYMIZE_MAX_PASSES; pass++) {
            const page = await (cursor ? scoped.startAfter(cursor) : scoped)
                .limit(WRITE_BATCH_SIZE)
                .get();

            if (page.empty) {
                return changed;
            }

            const batch = this.db.batch();
            let queued = 0;

            for (const docSnap of page.docs) {
                const patch = labelPatchFor(
                    docSnap.data() as Record<string, unknown>,
                    userId
                );
                if (patch) {
                    batch.update(docSnap.ref, {
                        ...patch,
                        updatedAt: new Date(),
                    });
                    queued++;
                }
            }

            if (queued > 0) {
                await batch.commit();
                changed += queued;
            }

            if (page.docs.length < WRITE_BATCH_SIZE) {
                return changed;
            }
            cursor = page.docs.at(-1) ?? null;
        }

        throw new AuditTrailNotAnonymizedError(changed);
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
