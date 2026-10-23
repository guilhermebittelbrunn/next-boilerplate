import type {
    DocumentData,
    DocumentSnapshot,
    Query,
    Transaction,
} from "firebase-admin/firestore";
import db from "../infra/database";
import {
    type OrganizationInvitationRecord,
    organizationInvitationMapper,
} from "../mappers/organization-invitation.mapper";
import { BaseRepository } from "./base.repository";

/**
 * A transaction reads through document references, not through the other repositories,
 * so the acceptance names the two collections it has to check on its own.
 */
const ORGANIZATION_COLLECTION = "organization";
const MEMBER_COLLECTION = "organizationMember";

export type IssueInvitationInput = {
    /** Derived from the organization and the address, so a second invitation reuses it. */
    id: string;
    organizationId: string;
    email: string;
    inviterEmail: string | null;
    invitedByUserId: string;
    tokenHash: string;
    now: Date;
    expiresAt: Date;
    /** An open invitation sent after this instant is too recent to send again. */
    resendNotBefore: Date;
    pendingMax: number;
};

export type IssueInvitationOutcome =
    | { status: "issued"; invitation: OrganizationInvitationRecord }
    | { status: "recently-sent" }
    | { status: "limit-reached" };

export type AcceptInvitationInput = {
    tokenHash: string;
    userId: string;
    /** Already normalized; compared with the address the invitation was sent to. */
    email: string;
    now: Date;
};

export type AcceptInvitationOutcome =
    | { status: "accepted"; organizationId: string }
    | { status: "already-accepted"; organizationId: string }
    | { status: "invalid" }
    | { status: "expired" }
    | { status: "email-mismatch" }
    | { status: "already-member" }
    | { status: "owner-has-members" };

function instantOf(value: unknown): Date | null {
    if (value == null) {
        return null;
    }
    if (value instanceof Date) {
        return value;
    }
    const maybe = value as { toDate?: () => Date };
    return typeof maybe.toDate === "function" ? maybe.toDate() : null;
}

/** Not accepted, not soft-deleted and still inside its validity window. */
function isOpen(data: DocumentData | undefined, now: Date): boolean {
    if (!data || data.acceptedAt != null || data.deletedAt != null) {
        return false;
    }
    const expiresAt = instantOf(data.expiresAt);
    return expiresAt !== null && expiresAt.getTime() > now.getTime();
}

function isLive(snapshot: DocumentSnapshot): boolean {
    return snapshot.exists && snapshot.get("deletedAt") == null;
}

/** What the invitation alone decides, before the organization and the person are read. */
function refuseInvitation(
    invitation: DocumentSnapshot,
    input: AcceptInvitationInput
): AcceptInvitationOutcome | null {
    if (invitation.get("acceptedAt") != null) {
        const organizationId = String(invitation.get("organizationId"));
        return invitation.get("acceptedByUserId") === input.userId
            ? { status: "already-accepted", organizationId }
            : { status: "invalid" };
    }

    const expiresAt = instantOf(invitation.get("expiresAt"));
    if (!expiresAt || expiresAt.getTime() <= input.now.getTime()) {
        return { status: "expired" };
    }

    return invitation.get("email") === input.email
        ? null
        : { status: "email-mismatch" };
}

class OrganizationInvitationRepository extends BaseRepository<OrganizationInvitationRecord> {
    constructor() {
        super(db, "organizationInvitation", organizationInvitationMapper);
    }

    private ofOrganization(organizationId: string): Query {
        return this.db
            .collection(this.table)
            .where("organizationId", "==", organizationId);
    }

    private byTokenHash(tokenHash: string): Query {
        return this.db
            .collection(this.table)
            .where("tokenHash", "==", tokenHash)
            .limit(1);
    }

    /**
     * Runs as a transaction over the organization's invitations, so two owners' clicks
     * cannot both slip under the ceiling, and the same address never gets two documents.
     * Writing the document again replaces the token: the link sent before stops working.
     */
    issue(input: IssueInvitationInput): Promise<IssueInvitationOutcome> {
        const ref = this.db.collection(this.table).doc(input.id);

        return this.db.runTransaction(async (tx) => {
            const [current, all] = await Promise.all([
                tx.get(ref),
                tx.get(this.ofOrganization(input.organizationId)),
            ]);

            const currentData = current.data();
            const lastSentAt = instantOf(currentData?.lastSentAt);
            if (
                isOpen(currentData, input.now) &&
                lastSentAt &&
                lastSentAt.getTime() > input.resendNotBefore.getTime()
            ) {
                return { status: "recently-sent" };
            }

            const openElsewhere = all.docs.filter(
                (docSnap) =>
                    docSnap.id !== input.id && isOpen(docSnap.data(), input.now)
            ).length;
            if (openElsewhere >= input.pendingMax) {
                return { status: "limit-reached" };
            }

            // `acceptedAt` is written as null on purpose: an absent field would not match
            // an equality filter on null.
            const document = {
                organizationId: input.organizationId,
                email: input.email,
                role: "member",
                tokenHash: input.tokenHash,
                invitedByUserId: input.invitedByUserId,
                inviterEmail: input.inviterEmail,
                expiresAt: input.expiresAt,
                lastSentAt: input.now,
                acceptedAt: null,
                acceptedByUserId: null,
                createdAt: input.now,
                updatedAt: input.now,
                deletedAt: null,
            };
            tx.set(ref, document);

            return {
                status: "issued",
                invitation: this.toDTO(input.id, document),
            };
        });
    }

    /** Accepted ones are left out: they are history, not something the owner can act on. */
    async listPendingByOrganization(
        organizationId: string
    ): Promise<OrganizationInvitationRecord[]> {
        const snapshot = await this.ofOrganization(organizationId).get();
        return snapshot.docs
            .filter((docSnap) => {
                const data = docSnap.data();
                return data.acceptedAt == null && data.deletedAt == null;
            })
            .map((docSnap) =>
                this.toDTO(
                    docSnap.id,
                    docSnap.data() as Record<string, unknown>
                )
            );
    }

    async findPendingInOrganization(
        id: string,
        organizationId: string
    ): Promise<OrganizationInvitationRecord | null> {
        const invitation = await this.findById(id);
        return invitation &&
            invitation.organizationId === organizationId &&
            invitation.acceptedAt === null
            ? invitation
            : null;
    }

    async findByTokenHash(
        tokenHash: string
    ): Promise<OrganizationInvitationRecord | null> {
        const snapshot = await this.byTokenHash(tokenHash).get();
        const docSnap = snapshot.docs[0];
        if (!docSnap || docSnap.get("deletedAt") != null) {
            return null;
        }
        return this.toDTO(
            docSnap.id,
            docSnap.data() as Record<string, unknown>
        );
    }

    /** Removed for good, and the invitee's address with it. */
    revoke(id: string): Promise<void> {
        return this.purge(id);
    }

    /** Whether the organization exists and its owner still belongs to it. */
    private async isOrganizationOpen(
        tx: Transaction,
        organizationId: string
    ): Promise<boolean> {
        const organization = await tx.get(
            this.db.collection(ORGANIZATION_COLLECTION).doc(organizationId)
        );
        if (!isLive(organization)) {
            return false;
        }

        // An organization whose owner moved to another one is dormant: nobody can
        // manage it, so nobody new may join it.
        const ownerMembership = await tx.get(
            this.db
                .collection(MEMBER_COLLECTION)
                .doc(String(organization.get("ownerUserId")))
        );
        return ownerMembership.get("organizationId") === organizationId;
    }

    /**
     * There is no transfer of ownership, so an owner who still has members cannot move:
     * they would strand the people in the organization they own.
     */
    private async refuseCurrentMembership(
        tx: Transaction,
        current: DocumentSnapshot,
        organizationId: string,
        userId: string
    ): Promise<AcceptInvitationOutcome | null> {
        const currentOrganizationId = current.get("organizationId");
        if (currentOrganizationId === organizationId) {
            return { status: "already-member" };
        }
        if (current.get("role") !== "owner") {
            return null;
        }

        const members = await tx.get(
            this.db
                .collection(MEMBER_COLLECTION)
                .where("organizationId", "==", currentOrganizationId)
        );
        return members.docs.some((docSnap) => docSnap.id !== userId)
            ? { status: "owner-has-members" }
            : null;
    }

    /**
     * Every read happens before any write, as Firestore transactions demand, and the whole
     * decision is retried if any document read changes underneath it. Two people racing
     * for the same token end with one membership; the same person clicking twice gets the
     * same answer twice.
     */
    acceptByTokenHash(
        input: AcceptInvitationInput
    ): Promise<AcceptInvitationOutcome> {
        return this.db.runTransaction(async (tx) => {
            const found = await tx.get(this.byTokenHash(input.tokenHash));
            const invitation = found.docs[0];
            if (!(invitation && isLive(invitation))) {
                return { status: "invalid" };
            }

            const refusal = refuseInvitation(invitation, input);
            if (refusal) {
                return refusal;
            }

            const organizationId = String(invitation.get("organizationId"));
            if (!(await this.isOrganizationOpen(tx, organizationId))) {
                return { status: "invalid" };
            }

            const memberRef = this.db
                .collection(MEMBER_COLLECTION)
                .doc(input.userId);
            const membershipRefusal = await this.refuseCurrentMembership(
                tx,
                await tx.get(memberRef),
                organizationId,
                input.userId
            );
            if (membershipRefusal) {
                return membershipRefusal;
            }

            tx.set(memberRef, {
                organizationId,
                userId: input.userId,
                role: "member",
                joinedAt: input.now,
                legacyClaimPending: false,
                createdAt: input.now,
                updatedAt: input.now,
                deletedAt: null,
            });
            tx.update(invitation.ref, {
                acceptedAt: input.now,
                acceptedByUserId: input.userId,
                updatedAt: input.now,
            });

            return { status: "accepted", organizationId };
        });
    }

    purgeByOrganization(organizationId: string): Promise<number> {
        return this.purgeAll(this.ofOrganization(organizationId));
    }

    /** Invitations sent to the address carry it whatever their state, so all of them go. */
    purgeByEmail(email: string): Promise<number> {
        return this.purgeAll(
            this.db.collection(this.table).where("email", "==", email)
        );
    }
}

export const organizationInvitationRepository =
    new OrganizationInvitationRepository();
