import { getAuthInstance } from "@repo/auth/server";
import type { UserDTO, UserType } from "@repo/sdk/src/types";
import db from "../infra/database";
import {
    mergeAuthAndFirestore,
    serializeFirestoreData,
} from "../mappers/user.mapper";
import { BaseRepository } from "./base.repository";

class UserRepository extends BaseRepository<UserDTO> {
    constructor() {
        super(db, "user");
    }

    async findByReferenceId(referenceId: string): Promise<UserDTO | null> {
        const querySnapshot = await this.db
            .collection(this.table)
            .where("reference_id", "==", referenceId)
            .where("deletedAt", "==", null)
            .get();

        if (querySnapshot.docs.length === 0) {
            return null;
        }

        return {
            ...(querySnapshot.docs[0].data() as UserDTO),
            id: querySnapshot.docs[0].id,
        };
    }

    async list(options?: { type?: UserType }): Promise<UserDTO[]> {
        const users = await this.findAll();
        const scoped = options?.type
            ? users.filter((user) => user.type === options.type)
            : users;

        const merged = await Promise.all(
            scoped.map((user) => this.mergeWithAuthUser(user))
        );

        return merged.filter((user): user is UserDTO => user !== null);
    }

    /**
     * A profile whose Firebase Auth account was deleted outside the app would otherwise
     * reject the whole listing, so it is dropped from the result instead.
     *
     * Only that specific case is swallowed: a transient Admin SDK failure must surface,
     * because silently hiding records from a management screen is worse than failing.
     */
    private async mergeWithAuthUser(user: UserDTO): Promise<UserDTO | null> {
        const profile = serializeFirestoreData(user);
        try {
            const authUser = await getAuthInstance().getUser(user.reference_id);
            return mergeAuthAndFirestore(authUser, profile) as UserDTO;
        } catch (error) {
            if ((error as { code?: string }).code === "auth/user-not-found") {
                return null;
            }
            throw error;
        }
    }
}

export const userRepository = new UserRepository();
