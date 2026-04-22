/** biome-ignore-all lint/style/noParameterProperties: <explanation> */
/** biome-ignore-all lint/nursery/noShadow: <explanation> */
import Mapper from "@/(shared)/mappers/Mapper";
import {
    addDoc,
    collection,
    type DocumentData,
    doc,
    type Firestore,
    getDoc,
    getDocs,
    query,
    updateDoc,
    type WithFieldValue,
    where,
} from "firebase/firestore";

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

    protected toEntity(id: string, raw: Record<string, unknown>): FirestoreDocumentRow {
        return { id, ...raw };
    }

    async findAll(): Promise<DTO[]> {
        const usersCollectionRef = collection(this.db, this.table);
        const querySnapshot = await getDocs(
            query(usersCollectionRef, where("deletedAt", "==", null))
        );

        return querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as DTO),
        }));
    }

    async findById(id: string): Promise<DTO | null> {
        const docRef = doc(this.db, this.table, id);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
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
        const usersCollectionRef = collection(this.db, this.table);

        const dataToCreate = {
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
        } as WithFieldValue<DocumentData>;

        const docRef = await addDoc(usersCollectionRef, dataToCreate);

        const created = {
            id: docRef.id,
            ...dataToCreate,
        } as DTO;

        if (this.rowMapper) {
            return this.rowMapper.toDTO(created as unknown as FirestoreDocumentRow);
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
        const usersCollectionRef = doc(this.db, this.table, data.id);
        const currentData = await this.findById(data.id);

        const updated = {
            ...currentData,
            ...data,
            updatedAt: new Date(),
        } as WithFieldValue<DocumentData>;

        const { id, ...dataToUpdate } = updated;

        await updateDoc(usersCollectionRef, dataToUpdate);

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
