import "server-only";

import admin from "firebase-admin";
import { keys } from "./keys";

const PAGE_COLLECTION = "pages";

let _db: admin.firestore.Firestore | null = null;

function getDb(): admin.firestore.Firestore {
  if (_db) {
    return _db;
  }

  const k = keys();
  if (
    !(
      k.FIREBASE_PROJECT_ID &&
      k.FIREBASE_CLIENT_EMAIL &&
      k.FIREBASE_PRIVATE_KEY
    )
  ) {
    throw new Error(
      "Firebase is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY."
    );
  }

  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: k.FIREBASE_PROJECT_ID,
        clientEmail: k.FIREBASE_CLIENT_EMAIL,
        privateKey: k.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      }),
    });
  }

  _db = admin.firestore();
  return _db;
}

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
