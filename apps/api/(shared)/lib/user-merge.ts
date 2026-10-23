import { getAuthInstance, getCurrentUser } from "@repo/auth/server";
import { type UserDTO, UserType } from "@repo/sdk/src/types";
import { logEvent } from "@repo/shared/utils/helpers/log";
import type { UserRecord } from "firebase-admin/auth";
import { mergeAuthAndFirestore } from "../mappers/user.mapper";
import { userRepository } from "../repositories/user.repository";
import { revokeAccountAccess } from "./account-access";
import { emitNotificationQuietly } from "./notifications";
import { initialOnboardingState } from "./onboarding";
import { ensureOrganizationMembershipQuietly } from "./organization-membership";
import { adminAuthErrorReason } from "./toolkit-error-codes";

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
    const profile = await findOrCreateProfile(uid);
    if (!profile) {
        return null;
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
    const profile = await findOrCreateProfile(authUser.uid);
    if (!profile) {
        return null;
    }

    return mergeAuthAndFirestore(authUser, profile);
}

/**
 * An archived profile means the admin took this account's access away: signing in again
 * must not hand it a fresh profile. Accounts archived while still enabled in Firebase
 * Auth are disabled here, on their first contact; a failure is retried on the next one.
 */
async function findOrCreateProfile(uid: string): Promise<UserDTO | null> {
    const profile = await userRepository.findByReferenceId(uid);
    if (profile) {
        return profile;
    }

    if (await userRepository.hasArchivedProfile(uid)) {
        await revokeAccountAccess(uid).catch((error: unknown) =>
            logEvent("auth", "archived-account-lockout-failed", {
                reason: adminAuthErrorReason(error),
            })
        );
        return null;
    }

    return createDefaultUserProfile(uid);
}

/**
 * The organization and the welcome notice are quiet on purpose: sign-up deletes the
 * account when this function throws, and neither must undo an account that was created.
 * A missing organization is created by the first request to a scoped route.
 */
export async function createDefaultUserProfile(
    uid: string,
    dto?: Partial<UserDTO>
): Promise<UserDTO> {
    const defaultProps = {
        type: UserType.COMMON,
        reference_id: uid,
        onboarding: initialOnboardingState(),
        ...dto,
    };

    const created = await userRepository.create({ ...defaultProps });

    if (created.type === UserType.COMMON) {
        await ensureOrganizationMembershipQuietly(created.id);
        await emitNotificationQuietly({
            userId: created.id,
            type: "welcome",
            params: {},
            dedupeKey: created.id,
        });
    }

    return created;
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
