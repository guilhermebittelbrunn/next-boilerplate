/**
 * Role inside the organization, unrelated to `UserType`: an organization owner is a
 * common user, and a platform admin is never resolved into an organization.
 */
export const ORGANIZATION_ROLES = ["owner", "member"] as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

export type OrganizationMembershipDTO = {
    organizationId: string;
    role: OrganizationRole;
    joinedAt: string;
};
