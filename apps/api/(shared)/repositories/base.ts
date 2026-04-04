/** biome-ignore-all lint/style/noParameterProperties: <explanation> */
/** biome-ignore-all lint/nursery/noShadow: <explanation> */
import {
    addDoc,
    collection,
    type DocumentData,
    doc,
    type Firestore,
    getDocs,
    query,
    updateDoc,
    type WithFieldValue,
    where,
} from "firebase/firestore";

type CreateRequest<DTO> = Omit<
    DTO,
    "id" | "createdAt" | "updatedAt" | "deletedAt"
>;

type UpdateRequest<DTO> = Omit<
    Partial<DTO>,
    "createdAt" | "updatedAt" | "deletedAt"
> & {
    id: string;
    deletedAt?: Date;
};

export class BaseRepository<DTO> {
    constructor(
        protected readonly db: Firestore,
        protected readonly table: string
    ) {}

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
        const usersCollectionRef = collection(this.db, this.table);
        const querySnapshot = await getDocs(
            query(
                usersCollectionRef,
                where("id", "==", id),
                where("deletedAt", "==", null)
            )
        );

        if (querySnapshot.docs.length === 0) {
            return null;
        }

        return {
            id: querySnapshot.docs[0].id,
            ...(querySnapshot.docs[0].data() as DTO),
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

        return {
            id: docRef.id,
            ...dataToCreate,
        } as DTO;
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
