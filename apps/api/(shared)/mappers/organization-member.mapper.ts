import type {
    OrganizationMembershipDTO,
    OrganizationRole,
} from "@repo/sdk/src/types";
import type { AllOptional } from "@repo/shared/utils";
import { normalizeFirestoreInstant } from "@repo/shared/utils";
import Mapper from "./Mapper";

/**
 * Internal to the API. The document id is the member's profile id, which is what keeps a
 * person in a single organization and lets the guard read the membership by id.
 */
export type OrganizationMemberRecord = OrganizationMembershipDTO & {
    id: string;
    userId: string;
    /** True until the records the person created before organizations existed are stamped. */
    legacyClaimPending: boolean;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
};

export type OrganizationMemberFirestoreRow = Record<string, unknown> & {
    id: string;
};

/** An unreadable role reads as the lesser one: it must never grant ownership. */
function roleOf(value: unknown): OrganizationRole {
    return value === "owner" ? "owner" : "member";
}

class OrganizationMemberMapper extends Mapper<
    OrganizationMemberFirestoreRow,
    OrganizationMemberRecord
> {
    toDTO(row: OrganizationMemberFirestoreRow): OrganizationMemberRecord {
        const { id, ...record } = row;
        return {
            id,
            organizationId: String(record.organizationId ?? ""),
            userId: String(record.userId ?? id),
            role: roleOf(record.role),
            joinedAt: normalizeFirestoreInstant(record.joinedAt),
            legacyClaimPending: record.legacyClaimPending === true,
            createdAt: normalizeFirestoreInstant(record.createdAt),
            updatedAt: normalizeFirestoreInstant(record.updatedAt),
            deletedAt:
                record.deletedAt == null
                    ? null
                    : normalizeFirestoreInstant(record.deletedAt),
        };
    }

    toPersistence(
        input: AllOptional<OrganizationMemberRecord>
    ): AllOptional<Record<string, unknown>> {
        const out: Record<string, unknown> = {};
        const keys: (keyof OrganizationMemberRecord)[] = [
            "organizationId",
            "userId",
            "role",
            "joinedAt",
            "legacyClaimPending",
        ];
        for (const key of keys) {
            if (input[key] !== undefined) {
                out[key] = input[key];
            }
        }
        return out as AllOptional<Record<string, unknown>>;
    }
}

export const organizationMemberMapper = new OrganizationMemberMapper();

export const toOrganizationMembershipDTO = (
    record: OrganizationMemberRecord
): OrganizationMembershipDTO => ({
    organizationId: record.organizationId,
    role: record.role,
    joinedAt: record.joinedAt,
});
