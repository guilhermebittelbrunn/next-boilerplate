import { getAuthInstance, getCurrentUser } from "@repo/auth/server";
import { type UserDTO, UserType } from "@repo/sdk/src/types";
import type { UserRecord } from "firebase-admin/auth";
import { mergeAuthAndFirestore } from "../mappers/user.mapper";
import { userRepository } from "../repositories/user.repository";

export const USER_COLLECTION = "user";

export async function getMergedUserByUid(
    uid: string
): Promise<Record<string, unknown> | null> {
    const authInstance = getAuthInstance();
    let userRecord: UserRecord;
    try {
        userRecord = await authInstance.getUser(uid);
    } catch {
        return null;
    }
    let profile = await userRepository.findByReferenceId(uid);

    if (!profile) {
        profile = await createDefaultUserProfile(uid);
    }

    return mergeAuthAndFirestore(userRecord, profile);
}

export async function getMergedUserFromIdToken(
    idToken: string | null
): Promise<Record<string, unknown> | null> {
    if (!idToken) {
        return null;
    }
    const authUser = await getCurrentUser(idToken);
    if (!authUser) {
        return null;
    }
    let profile = await userRepository.findByReferenceId(authUser.uid);

    if (!profile) {
        profile = await createDefaultUserProfile(authUser.uid);
    }

    return mergeAuthAndFirestore(authUser, profile);
}

export function createDefaultUserProfile(uid: string, dto?: Partial<UserDTO>) {
    const defaultProps = {
        type: UserType.COMMON,
        reference_id: uid,
        ...dto,
    };

    return userRepository.create({ ...defaultProps });
}

export async function getMergedUserByFirestoreDocId(
    firestoreDocId: string
): Promise<Record<string, unknown> | null> {
    const profile = await userRepository.findById(firestoreDocId);
    if (!profile) {
        return null;
    }
    return getMergedUserByUid(profile.reference_id);
}
