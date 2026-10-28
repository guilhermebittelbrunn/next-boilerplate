import type { UserPreferences } from "../user/user";
import type { OrganizationRole } from "./organization";

export type OrganizationDTO = {
    id: string;
    ownerUserId: string;
    /** The caller's role, not a property of the organization. */
    viewerRole: OrganizationRole;
};

export type OrganizationMemberDTO = {
    userId: string;
    role: OrganizationRole;
    /** `null` when the member's account is gone or archived. */
    email: string | null;
    displayName: string | null;
    joinedAt: string;
    /** The profile was archived or no longer exists, so it cannot receive ownership. */
    archived: boolean;
};

export type TransferOrganizationOwnershipResponse = { ownerUserId: string };

export type OrganizationInvitationStatus = "pending" | "expired";

/** The token never leaves the server: the invitation only travels by email. */
export type OrganizationInvitationDTO = {
    id: string;
    email: string;
    role: "member";
    status: OrganizationInvitationStatus;
    expiresAt: string;
    lastSentAt: string;
    createdAt: string;
};

export type CreateOrganizationInvitationRequest = {
    email: string;
    /** Language of the invitation email and of the link inside it. */
    locale?: UserPreferences["locale"];
};

/**
 * `failed` means the invitation is stored but the provider refused the email: the owner
 * can send it again.
 */
export type OrganizationInvitationDelivery = "sent" | "failed";

export type CreateOrganizationInvitationResponse = {
    invitation: OrganizationInvitationDTO;
    delivery: OrganizationInvitationDelivery;
};

export type OrganizationInvitationTokenRequest = { token: string };

export type OrganizationInvitationPreviewDTO = {
    email: string;
    inviterEmail: string | null;
    expiresAt: string;
};

export type AcceptOrganizationInvitationResponse = { organizationId: string };
