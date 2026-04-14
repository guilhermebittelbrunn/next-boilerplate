import { getAuthInstance } from "@repo/auth/server";
import type { UserDTO } from "@repo/sdk/src/types";
import { collection, getDocs, query, where } from "firebase/firestore";
import db from "../infra/dabatase";
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
        const usersCollectionRef = collection(this.db, this.table);
        const querySnapshot = await getDocs(
            query(
                usersCollectionRef,
                where("reference_id", "==", referenceId),
                where("deletedAt", "==", null)
            )
        );

        if (querySnapshot.docs.length === 0) {
            return null;
        }

        return {
            ...(querySnapshot.docs[0].data() as UserDTO),
            id: querySnapshot.docs[0].id,
        };
    }

    async list(): Promise<UserDTO[]> {
        const users = await this.findAll();

        const results: Record<string, unknown>[] = [];

        for (const user of users) {
            const authUser = await getAuthInstance().getUser(user.reference_id);
            const profile = serializeFirestoreData(user);
            results.push(mergeAuthAndFirestore(authUser, profile));
        }

        return results as UserDTO[];
    }
}

export const userRepository = new UserRepository();
