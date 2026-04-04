import "server-only";

import type { DocumentSnapshot, Timestamp } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "../firestore-db";
import { BaseRepository } from "./base.repository";

const USERS_COLLECTION = "users";
const FIRESTORE_NOT_FOUND_CODE = 5;

export type UserProfileRole = "admin" | "common";

export type UserProfile = {
    uid: string;
    email: string | null;
    role: UserProfileRole;
    createdAt: Timestamp;
    updatedAt: Timestamp;
};

/** JSON-safe profile for API / client */
export type UserProfileDTO = {
    uid: string;
    email: string | null;
    role: UserProfileRole;
    createdAt: string;
    updatedAt: string;
};

function isFirestoreNotFoundError(error: unknown): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: unknown }).code === FIRESTORE_NOT_FOUND_CODE
    );
}

function toDTO(data: UserProfile): UserProfileDTO {
    return {
        uid: data.uid,
        email: data.email,
        role: data.role,
        createdAt: data.createdAt.toDate().toISOString(),
        updatedAt: data.updatedAt.toDate().toISOString(),
    };
}

function fromDoc(uid: string, snap: DocumentSnapshot): UserProfile | null {
    if (!snap.exists) {
        return null;
    }
    const d = snap.data() as Record<string, unknown>;
    const role = d.role === "admin" || d.role === "common" ? d.role : null;
    if (!role) {
        return null;
    }
    const createdAt = d.createdAt as Timestamp | undefined;
    const updatedAt = d.updatedAt as Timestamp | undefined;
    if (!createdAt) {
        return null;
    }
    if (!updatedAt) {
        return null;
    }
    return {
        uid,
        email: typeof d.email === "string" ? d.email : null,
        role,
        createdAt,
        updatedAt,
    };
}

export class userRepository extends BaseRepository<UserProfile> {
    constructor() {
        super(USERS_COLLECTION);
    }

    async getByUid(uid: string): Promise<UserProfile | null> {
        try {
            const snap = await this.getDb()
                .collection(USERS_COLLECTION)
                .doc(uid)
                .get();
            return fromDoc(uid, snap);
        } catch (error) {
            if (isFirestoreNotFoundError(error)) {
                return null;
            }
            throw error;
        }
    }

    async getDTOByUid(uid: string): Promise<UserProfileDTO | null> {
        const p = await this.getByUid(uid);
        return p ? toDTO(p) : null;
    }

    /**
     * Creates `users/{uid}` with `role: common`. Server-only; never trust client for admin.
     */
    async createDefault(
        uid: string,
        email: string | null
    ): Promise<UserProfile> {
        try {
            const ref = this.getDb().collection(USERS_COLLECTION).doc(uid);
            const now = FieldValue.serverTimestamp();
            await ref.set({
                email,
                // role: "common" satisfies UserProfileRole,
                role: "admin" satisfies UserProfileRole,
                createdAt: now,
                updatedAt: now,
            });
            const snap = await ref.get();
            const parsed = fromDoc(uid, snap);
            if (!parsed) {
                throw new Error("Failed to read user profile after create");
            }
            return parsed;
        } catch (error) {
            if (isFirestoreNotFoundError(error)) {
                throw new Error("Firestore database not found");
            }
            throw error;
        }
    }

    async updateProfile(
        uid: string,
        partial: Partial<Pick<UserProfile, "email" | "role">> &
            Record<string, unknown>
    ): Promise<void> {
        const store = getDb();
        const ref = store.collection(USERS_COLLECTION).doc(uid);
        await ref.update({
            ...partial,
            updatedAt: FieldValue.serverTimestamp(),
        });
    }
}

export function profileToDTO(profile: UserProfile): UserProfileDTO {
    return toDTO(profile);
}
