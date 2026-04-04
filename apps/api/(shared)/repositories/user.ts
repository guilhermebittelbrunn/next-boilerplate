import { collection, getDocs, query, where } from "firebase/firestore";
import db from "../infra/dabatase";
import { BaseRepository } from "./base";

export type User = {
    id: string;
    type: "admin" | "common";
    reference_id: string;
    createdAt: Date;
    updatedAt: Date;
};

class UserRepository extends BaseRepository<User> {
    constructor() {
        super(db, "user");
    }

    async findByReferenceId(referenceId: string): Promise<User | null> {
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
            ...(querySnapshot.docs[0].data() as User),
            id: querySnapshot.docs[0].id,
        };
    }
}

export const userRepository = new UserRepository();
