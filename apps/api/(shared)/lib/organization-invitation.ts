import { createHash, randomBytes } from "node:crypto";
import { getAuthInstance } from "@repo/auth/server";
import { sendEmail } from "@repo/email";
import { actionLinkEmail } from "@repo/email/templates/action-link";
import type { Locale } from "@repo/internationalization/utils";
import { getBrand } from "@repo/next-config/brand";
import type { OrganizationInvitationDelivery } from "@repo/sdk/src/types";
import { env } from "@/env";
import { organizationRepository } from "../repositories/organization.repository";
import { organizationMemberRepository } from "../repositories/organization-member.repository";
import { userRepository } from "../repositories/user.repository";

/** The invitation email says "7 days" in its copy; change both together. */
export const ORGANIZATION_INVITATION_TTL_DAYS = 7;
export const ORGANIZATION_PENDING_INVITATIONS_MAX = 20;
export const ORGANIZATION_INVITATION_RESEND_COOLDOWN_SECONDS = 60;

const MS_PER_SECOND = 1000;
const MS_PER_DAY = 86_400_000;
/** 256 bits: guessing a live token is out of reach even with no rate limit at all. */
const TOKEN_BYTES = 32;

export const generateInvitationToken = (): string =>
    randomBytes(TOKEN_BYTES).toString("base64url");

/** Only the hash is stored: a leaked database does not hand out working links. */
export const hashInvitationToken = (token: string): string =>
    createHash("sha256").update(token).digest("hex");

export const normalizeInvitationEmail = (email: string): string =>
    email.trim().toLowerCase();

/** One document per organization and address, whatever happens to it in between. */
export const invitationDocumentId = (
    organizationId: string,
    normalizedEmail: string
): string =>
    createHash("sha256")
        .update(`${organizationId}:${normalizedEmail}`)
        .digest("hex");

export const invitationExpiry = (now: Date): Date =>
    new Date(now.getTime() + ORGANIZATION_INVITATION_TTL_DAYS * MS_PER_DAY);

export const invitationResendNotBefore = (now: Date): Date =>
    new Date(
        now.getTime() -
            ORGANIZATION_INVITATION_RESEND_COOLDOWN_SECONDS * MS_PER_SECOND
    );

function invitationLink(token: string, locale: Locale): string | null {
    const base = env.NEXT_PUBLIC_APP_URL;
    return base
        ? `${base}/${locale}/invite?token=${encodeURIComponent(token)}`
        : null;
}

function firebaseErrorCode(error: unknown): string | null {
    const code = (error as { code?: unknown } | null)?.code;
    return typeof code === "string" ? code : null;
}

/**
 * Looks the address up only to compare it with this organization's own members, so the
 * owner learns nothing about whether it has an account or where else it belongs.
 */
export async function isMemberOfOrganization(
    normalizedEmail: string,
    organizationId: string
): Promise<boolean> {
    let uid: string;
    try {
        uid = (await getAuthInstance().getUserByEmail(normalizedEmail)).uid;
    } catch (error) {
        if (firebaseErrorCode(error) === "auth/user-not-found") {
            return false;
        }
        throw error;
    }

    const profile = await userRepository.findByReferenceId(uid);
    if (!profile) {
        return false;
    }

    return Boolean(
        await organizationMemberRepository.findInOrganization(
            profile.id,
            organizationId
        )
    );
}

/**
 * An organization whose owner now belongs to another one is dormant, and one whose owner
 * was archived has nobody left to run it: either way, its invitations no longer lead
 * anywhere.
 */
export async function isOrganizationActive(
    organizationId: string
): Promise<boolean> {
    const organization = await organizationRepository.findById(organizationId);
    if (!organization) {
        return false;
    }

    const [ownerMembership, ownerProfile] = await Promise.all([
        organizationMemberRepository.findByUserId(organization.ownerUserId),
        userRepository.findById(organization.ownerUserId),
    ]);
    return (
        ownerProfile !== null &&
        ownerMembership?.organizationId === organizationId
    );
}

export type InvitationDeliveryInput = {
    to: string;
    token: string;
    inviterEmail: string | null;
    locale: Locale;
};

/**
 * The title names whoever invited by their address, not their display name: the name is
 * free text chosen at sign-up and would land in an email sent from the fork's domain.
 */
export async function deliverInvitation(
    input: InvitationDeliveryInput
): Promise<OrganizationInvitationDelivery> {
    const url = invitationLink(input.token, input.locale);
    if (!url) {
        return "failed";
    }

    const result = await sendEmail({
        template: actionLinkEmail,
        to: input.to,
        locale: input.locale,
        data: {
            name: input.inviterEmail ?? getBrand().name,
            url,
            action: "organizationInvitation",
        },
    });

    return result.sent ? "sent" : "failed";
}
