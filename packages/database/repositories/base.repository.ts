import admin from "firebase-admin";
import { keys } from "../keys";

let _db: admin.firestore.Firestore | null = null;

export class BaseRepository<Domain extends { id: string }> {
    // biome-ignore lint/style/noParameterProperties: required by current class shape
    constructor(private readonly collection: string) {}

    getDb(): admin.firestore.Firestore {
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

    async findMany(): Promise<Domain[]> {
        const store = this.getDb();
        const snap = await store.collection(this.collection).get();
        return snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Domain, "id">),
        })) as Domain[];
    }

    async create(data: Omit<Domain, "id">): Promise<Domain> {
        const store = this.getDb();
        const ref = await store
            .collection(this.collection)
            .add(
                data as admin.firestore.WithFieldValue<admin.firestore.DocumentData>
            );
        const doc = await ref.get();
        return { id: doc.id, ...(doc.data() as Omit<Domain, "id">) } as Domain;
    }

    async delete(id: string): Promise<void> {
        const store = this.getDb();
        await store.collection(this.collection).doc(id).delete();
    }
}
