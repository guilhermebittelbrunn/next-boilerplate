/** biome-ignore-all lint/style/noParameterProperties: the constructor args are the repository's configuration */

import {
    type DocumentData,
    FieldPath,
    type Firestore,
    type Query,
} from "firebase-admin/firestore";
import type Mapper from "@/(shared)/mappers/Mapper";

export type CreateRequest<DTO> = Omit<
    DTO,
    "id" | "createdAt" | "updatedAt" | "deletedAt"
>;

export type UpdateRequest<DTO> = Omit<
    Partial<DTO>,
    "createdAt" | "updatedAt" | "deletedAt"
> & {
    id: string;
    deletedAt?: Date;
};

/** Persisted document merged with id (mapper input shape). */
export type FirestoreDocumentRow = Record<string, unknown> & { id: string };

export type PageRequest = { limit: number; cursorId: string | null };

export type RepositoryPage<DTO> = {
    items: DTO[];
    nextCursorId: string | null;
};

/** The cursor pointed at a document that is not there, so the page cannot be anchored. */
export class PaginationCursorError extends Error {
    constructor(cursorId: string) {
        super(`Pagination anchor not found: ${cursorId}`);
        this.name = "PaginationCursorError";
    }
}

export class BaseRepository<DTO> {
    constructor(
        protected readonly db: Firestore,
        protected readonly table: string,
        protected readonly rowMapper?: Mapper<FirestoreDocumentRow, DTO>
    ) {}

    protected toEntity(
        id: string,
        raw: Record<string, unknown>
    ): FirestoreDocumentRow {
        return { id, ...raw };
    }

    protected toDTO(id: string, raw: Record<string, unknown>): DTO {
        if (this.rowMapper) {
            return this.rowMapper.toDTO(this.toEntity(id, raw));
        }
        return { id, ...(raw as DTO) };
    }

    /** Reads the whole collection. Prefer `paginate` for anything a user can grow. */
    async findAll(): Promise<DTO[]> {
        const querySnapshot = await this.db
            .collection(this.table)
            .where("deletedAt", "==", null)
            .get();

        return querySnapshot.docs.map((docSnap) =>
            this.toDTO(docSnap.id, docSnap.data() as Record<string, unknown>)
        );
    }

    /**
     * Reads one page, newest first. The id breaks ties on `createdAt`: records stamped in
     * the same instant would otherwise be repeated or skipped across pages, since the
     * cursor can only point at one of them.
     */
    protected async paginate(
        query: Query,
        { limit, cursorId }: PageRequest
    ): Promise<RepositoryPage<DTO>> {
        let ordered = query
            .orderBy("createdAt", "desc")
            .orderBy(FieldPath.documentId(), "desc");

        if (cursorId) {
            const anchor = await this.db
                .collection(this.table)
                .doc(cursorId)
                .get();

            if (!anchor.exists) {
                throw new PaginationCursorError(cursorId);
            }

            ordered = ordered.startAfter(anchor);
        }

        const snapshot = await ordered.limit(limit + 1).get();
        const hasMore = snapshot.docs.length > limit;
        const pageDocs = hasMore
            ? snapshot.docs.slice(0, limit)
            : snapshot.docs;

        return {
            items: pageDocs.map((docSnap) =>
                this.toDTO(
                    docSnap.id,
                    docSnap.data() as Record<string, unknown>
                )
            ),
            nextCursorId: hasMore ? (pageDocs.at(-1)?.id ?? null) : null,
        };
    }

    /**
     * Firestore bills an aggregation by the index entries it scans, not by document, so
     * this stays cheap where `findAll().length` would charge for the whole collection.
     */
    protected async countQuery(query: Query): Promise<number> {
        const snapshot = await query.count().get();
        return snapshot.data().count;
    }

    async findById(id: string): Promise<DTO | null> {
        const snap = await this.db.collection(this.table).doc(id).get();
        if (!snap.exists) {
            return null;
        }
        const raw = snap.data() as DocumentData & { deletedAt?: unknown };
        if (raw.deletedAt != null) {
            return null;
        }
        if (this.rowMapper) {
            return this.rowMapper.toDTO(
                this.toEntity(snap.id, raw as Record<string, unknown>)
            );
        }
        return {
            ...(snap.data() as DTO),
            id: snap.id,
        };
    }

    async create(data: CreateRequest<DTO>): Promise<DTO> {
        const dataToCreate = {
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
        } as DocumentData;

        const docRef = await this.db.collection(this.table).add(dataToCreate);

        const created = {
            id: docRef.id,
            ...dataToCreate,
        } as DTO;

        if (this.rowMapper) {
            return this.rowMapper.toDTO(
                created as unknown as FirestoreDocumentRow
            );
        }
        return created;
    }

    async createBulk(data: CreateRequest<DTO>[]): Promise<DTO[]> {
        const result = await Promise.all(
            data.map(async (item) => this.create(item))
        );

        return result;
    }

    /**
     * Writes only the fields it was given. Re-reading the document and writing it back
     * would round-trip stored timestamps through the mapper, landing `createdAt` as an ISO
     * string — and Firestore orders by type before value, which breaks `orderBy`.
     */
    async update(data: UpdateRequest<DTO>): Promise<string> {
        const { id, ...fields } = data;

        await this.db
            .collection(this.table)
            .doc(id)
            .update({
                ...(fields as DocumentData),
                updatedAt: new Date(),
            });

        return id;
    }

    async updateBulk(data: UpdateRequest<DTO>[]): Promise<string[]> {
        const result = await Promise.all(
            data.map(async (item) => this.update(item))
        );

        return result;
    }

    async delete(id: string): Promise<void> {
        await this.update({ id, deletedAt: new Date() } as UpdateRequest<DTO>);
    }

    async deleteBulk(ids: string[]): Promise<void> {
        await Promise.all(ids.map(async (id) => this.delete(id)));
    }
}
