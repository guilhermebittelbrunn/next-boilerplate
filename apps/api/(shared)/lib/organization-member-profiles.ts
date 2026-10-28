import { getAuthInstance } from "@repo/auth/server";
import type { OrganizationMemberDTO } from "@repo/sdk/src/types";
import type { OrganizationMemberRecord } from "../mappers/organization-member.mapper";
import { userRepository } from "../repositories/user.repository";

/** Firebase Admin's `getUsers` takes at most 100 identifiers per call. */
const AUTH_LOOKUP_BATCH = 100;

async function authUsersByUid(
    uids: string[]
): Promise<Map<string, { email: string | null; displayName: string | null }>> {
    const byUid = new Map<
        string,
        { email: string | null; displayName: string | null }
    >();

    for (let start = 0; start < uids.length; start += AUTH_LOOKUP_BATCH) {
        const { users } = await getAuthInstance().getUsers(
            uids.slice(start, start + AUTH_LOOKUP_BATCH).map((uid) => ({ uid }))
        );
        for (const user of users) {
            byUid.set(user.uid, {
                email: user.email ?? null,
                displayName: user.displayName ?? null,
            });
        }
    }

    return byUid;
}

/**
 * Names and addresses come from Firebase Auth, never from the membership, so they stay
 * current. An archived profile or a deleted account still lists, with both left empty,
 * rather than failing the whole screen. The owner comes first, then by arrival.
 */
export async function describeOrganizationMembers(
    memberships: OrganizationMemberRecord[]
): Promise<OrganizationMemberDTO[]> {
    const profiles = await Promise.all(
        memberships.map((membership) =>
            userRepository.findById(membership.userId)
        )
    );
    const uidByProfile = new Map<string, string>();
    for (const profile of profiles) {
        if (profile?.reference_id) {
            uidByProfile.set(profile.id, profile.reference_id);
        }
    }

    const authByUid = await authUsersByUid([...uidByProfile.values()]);

    return memberships
        .map((membership, index): OrganizationMemberDTO => {
            const uid = uidByProfile.get(membership.userId);
            const auth = uid ? authByUid.get(uid) : undefined;
            return {
                userId: membership.userId,
                role: membership.role,
                email: auth?.email ?? null,
                displayName: auth?.displayName ?? null,
                joinedAt: membership.joinedAt,
                archived: profiles[index] === null,
            };
        })
        .sort((a, b) => {
            if (a.role !== b.role) {
                return a.role === "owner" ? -1 : 1;
            }
            return a.joinedAt.localeCompare(b.joinedAt);
        });
}
