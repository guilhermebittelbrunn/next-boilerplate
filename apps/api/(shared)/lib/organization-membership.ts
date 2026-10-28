import { logEvent } from "@repo/shared/utils/helpers/log";
import type { OrganizationMemberRecord } from "../mappers/organization-member.mapper";
import { entityRepository } from "../repositories/entity.repository";
import { organizationRepository } from "../repositories/organization.repository";
import { organizationMemberRepository } from "../repositories/organization-member.repository";
import { userRepository } from "../repositories/user.repository";

/** The membership was neither there nor creatable, which only a concurrent removal explains. */
export class OrganizationMembershipUnresolvedError extends Error {
    constructor() {
        super("Organization membership could not be resolved");
        this.name = "OrganizationMembershipUnresolvedError";
    }
}

/**
 * Only the home organization claims records: a member of someone else's organization must
 * never pull their own older records into it.
 */
async function claimLegacyRecordsQuietly(
    membership: OrganizationMemberRecord
): Promise<void> {
    if (membership.role !== "owner") {
        return;
    }

    try {
        const outcome = await entityRepository.claimUnscopedByUserId(
            membership.userId,
            membership.organizationId
        );
        if (outcome === "finished") {
            await organizationMemberRepository.clearLegacyClaim(
                membership.userId
            );
        } else {
            logEvent("organization", "legacy-claim-unfinished");
        }
    } catch (error) {
        // The flag stays set, so the next request tries again; the claim is idempotent.
        logEvent("organization", "legacy-claim-failed", {
            reason: error instanceof Error ? error.name : "unknown",
        });
    }
}

async function joinHomeOrganization(
    profileId: string
): Promise<OrganizationMemberRecord> {
    const home = await organizationRepository.findOwnedBy(profileId);
    const created = await organizationMemberRepository.createOwnerMembership({
        userId: profileId,
        organizationId: home?.id ?? null,
    });
    if (created) {
        return created;
    }

    const written = await organizationMemberRepository.findByUserId(profileId);
    if (!written) {
        throw new OrganizationMembershipUnresolvedError();
    }
    return written;
}

/**
 * The organization a common profile works in, created on first contact for a profile that
 * predates organizations or whose sign-up could not store one. Under impersonation this is
 * called with the impersonated profile, and the creation is a system write, not an edit:
 * the same thing the person's own next sign-in would do.
 */
export async function resolveOrganizationMembership(
    profileId: string
): Promise<OrganizationMemberRecord> {
    const membership =
        (await organizationMemberRepository.findByUserId(profileId)) ??
        (await joinHomeOrganization(profileId));

    if (membership.legacyClaimPending) {
        await claimLegacyRecordsQuietly(membership);
    }

    return membership;
}

/**
 * Sign-up must not fail because the organization could not be stored: the account exists
 * either way, and the first request to a scoped route creates what is missing.
 */
export async function ensureOrganizationMembershipQuietly(
    profileId: string
): Promise<void> {
    try {
        await resolveOrganizationMembership(profileId);
    } catch (error) {
        logEvent("organization", "membership-create-failed", {
            reason: error instanceof Error ? error.name : "unknown",
        });
    }
}

/**
 * Looks at every organization the profile owns, its home and any handed to it: an owner
 * with live members in one of them would leave those people with nobody to manage them
 * until ownership is passed on. A member whose profile was archived, or no longer exists,
 * is not stranded: that account is disabled and does not come back on its own.
 */
export async function ownsOrganizationWithMembers(
    profileId: string
): Promise<boolean> {
    const owned = await organizationRepository.listOwnedBy(profileId);
    if (owned.length === 0) {
        return false;
    }

    const memberships = await Promise.all(
        owned.map((organization) =>
            organizationMemberRepository.listByOrganization(organization.id)
        )
    );
    const others = memberships
        .flat()
        .filter((member) => member.userId !== profileId);
    if (others.length === 0) {
        return false;
    }

    const profiles = await Promise.all(
        others.map((member) => userRepository.findById(member.userId))
    );
    return profiles.some((profile) => profile !== null);
}
