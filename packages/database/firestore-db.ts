import "server-only";

import admin from "firebase-admin";
import { keys } from "./keys";

let _db: admin.firestore.Firestore | null = null;

export function getDb(): admin.firestore.Firestore {
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
            "Firebase is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY (or FIREBASE_ADMIN_* fallbacks)."
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

export function isFirestoreConfigured(): boolean {
    const projectId =
        process.env.FIREBASE_PROJECT_ID ??
        process.env.FIREBASE_ADMIN_PROJECT_ID ??
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const email =
        process.env.FIREBASE_CLIENT_EMAIL ??
        process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey =
        process.env.FIREBASE_PRIVATE_KEY ??
        process.env.FIREBASE_ADMIN_PRIVATE_KEY;
    return Boolean(projectId && email && privateKey);
}
