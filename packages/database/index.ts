import "server-only";

import { getDb } from "./firestore-db";

const PAGE_COLLECTION = "pages";

export type Page = {
  id: string;
  name: string;
};

export const database = {
  page: {
    async findMany(): Promise<Page[]> {
      const store = getDb();
      const snap = await store.collection(PAGE_COLLECTION).get();
      return snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Page[];
    },

    async findManyByKeyword(keyword: string): Promise<Page[]> {
      const store = getDb();
      const snap = await store.collection(PAGE_COLLECTION).get();
      const lower = keyword.toLowerCase();
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Page)
        .filter((p) => p.name.toLowerCase().includes(lower));
    },

    async create(params: { data: { name: string } }): Promise<Page> {
      const store = getDb();
      const ref = await store.collection(PAGE_COLLECTION).add({
        name: params.data.name,
      });
      const doc = await ref.get();
      return { id: doc.id, ...doc.data() } as Page;
    },

    async delete(params: { where: { id: string } }): Promise<void> {
      const store = getDb();
      await store.collection(PAGE_COLLECTION).doc(params.where.id).delete();
    },
  },
};

export { getDb, isFirestoreConfigured } from "./firestore-db";
export {
  userRepository,
  profileToDTO,
  type UserProfile,
  type UserProfileDTO,
  type UserProfileRole,
} from "./repositories/user.repository";
