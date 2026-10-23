import type { OrganizationInvitationDTO } from "@repo/sdk/src/types";
import type { AllOptional } from "@repo/shared/utils";
import { normalizeFirestoreInstant, stringIfExists } from "@repo/shared/utils";
import Mapper from "./Mapper";

/**
 * Internal to the API. The document id is derived from the organization and the address,
 * so inviting the same person again reuses it. `tokenHash` and the two profile ids never
 * leave the server.
 */
export type OrganizationInvitationRecord = {
    id: string;
    organizationId: string;
    email: string;
    role: "member";
    tokenHash: string;
    invitedByUserId: string;
    inviterEmail: string | null;
    expiresAt: string;
    lastSentAt: string;
    acceptedAt: string | null;
    acceptedByUserId: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
};

export type OrganizationInvitationFirestoreRow = Record<string, unknown> & {
    id: string;
};

function instantOrNull(value: unknown): string | null {
    return value == null ? null : normalizeFirestoreInstant(value);
}

class OrganizationInvitationMapper extends Mapper<
    OrganizationInvitationFirestoreRow,
    OrganizationInvitationRecord
> {
    toDTO(
        row: OrganizationInvitationFirestoreRow
    ): OrganizationInvitationRecord {
        const { id, ...record } = row;
        return {
            id,
            organizationId: String(record.organizationId ?? ""),
            email: String(record.email ?? ""),
            role: "member",
            tokenHash: String(record.tokenHash ?? ""),
            invitedByUserId: String(record.invitedByUserId ?? ""),
            inviterEmail: stringIfExists(record.inviterEmail),
            expiresAt: normalizeFirestoreInstant(record.expiresAt),
            lastSentAt: normalizeFirestoreInstant(record.lastSentAt),
            acceptedAt: instantOrNull(record.acceptedAt),
            acceptedByUserId: stringIfExists(record.acceptedByUserId),
            createdAt: normalizeFirestoreInstant(record.createdAt),
            updatedAt: normalizeFirestoreInstant(record.updatedAt),
            deletedAt: instantOrNull(record.deletedAt),
        };
    }

    toPersistence(
        input: AllOptional<OrganizationInvitationRecord>
    ): AllOptional<Record<string, unknown>> {
        const out: Record<string, unknown> = {};
        const keys: (keyof OrganizationInvitationRecord)[] = [
            "organizationId",
            "email",
            "role",
            "tokenHash",
            "invitedByUserId",
            "inviterEmail",
            "expiresAt",
            "lastSentAt",
            "acceptedAt",
            "acceptedByUserId",
        ];
        for (const key of keys) {
            if (input[key] !== undefined) {
                out[key] = input[key];
            }
        }
        return out as AllOptional<Record<string, unknown>>;
    }
}

export const organizationInvitationMapper = new OrganizationInvitationMapper();

/** The expiry is checked on every read, so a lapsed invitation reads as expired at once. */
export const toOrganizationInvitationDTO = (
    record: OrganizationInvitationRecord,
    now: Date = new Date()
): OrganizationInvitationDTO => ({
    id: record.id,
    email: record.email,
    role: record.role,
    status:
        new Date(record.expiresAt).getTime() > now.getTime()
            ? "pending"
            : "expired",
    expiresAt: record.expiresAt,
    lastSentAt: record.lastSentAt,
    createdAt: record.createdAt,
});
