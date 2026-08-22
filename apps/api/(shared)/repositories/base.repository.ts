/** biome-ignore-all lint/style/noParameterProperties: the constructor args are the repository's configuration */

import type { DocumentData, Firestore } from "firebase-admin/firestore";
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

    async findAll(): Promise<DTO[]> {
        const querySnapshot = await this.db
            .collection(this.table)
            .where("deletedAt", "==", null)
            .get();

        return querySnapshot.docs.map((docSnap) => {
            const raw = docSnap.data() as Record<string, unknown>;
            if (this.rowMapper) {
                return this.rowMapper.toDTO(this.toEntity(docSnap.id, raw));
            }
            return { id: docSnap.id, ...(raw as DTO) };
        });
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

    async update(data: UpdateRequest<DTO>): Promise<string> {
        const docRef = this.db.collection(this.table).doc(data.id);
        const currentData = await this.findById(data.id);

        const updated = {
            ...currentData,
            ...data,
            updatedAt: new Date(),
        } as DocumentData;

        const { id, ...dataToUpdate } = updated;

        await docRef.update(dataToUpdate);

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
