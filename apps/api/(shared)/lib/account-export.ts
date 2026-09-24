import type {
    AccountDataExportDTO,
    AccountDataExportRecord,
    AccountDTO,
    AuditEventDTO,
    UserDTO,
} from "@repo/sdk/src/types";
import { logEvent } from "@repo/shared/utils/helpers/log";
import { auditEventRepository } from "../repositories/audit-event.repository";
import { entityRepository } from "../repositories/entity.repository";
import { resolvePreferences } from "./account-avatar";
import { isStorageConfigured, listObjectPaths, ownerPrefix } from "./storage";
import { getMergedUserByFirestoreDocId } from "./user-merge";

/**
 * Ceiling per block. A file is still useful when it stops at a known line; a response
 * that quietly drops half the records is not, which is why the payload says `truncated`
 * instead of just ending.
 */
export const EXPORT_MAX_RECORDS = 5000;

const EXPORT_FORMAT = {
    name: "account-data-export",
    version: 1,
} as const;

/** The signed URL expires in 15 minutes, so it is dead the moment the file is saved. */
const OMITTED_ACCOUNT_FIELDS = new Set(["avatarUrl"]);

export class AccountExportProfileMissingError extends Error {
    constructor(profileId: string) {
        super(`No account to export for profile ${profileId}`);
        this.name = "AccountExportProfileMissingError";
    }
}

function toExportAccount(
    merged: Record<string, unknown>
): Omit<AccountDTO, "avatarUrl"> {
    const withoutSignedUrl = Object.fromEntries(
        Object.entries(merged).filter(
            ([key]) => !OMITTED_ACCOUNT_FIELDS.has(key)
        )
    );

    const avatar =
        typeof merged.avatar === "string" && merged.avatar
            ? merged.avatar
            : null;
    const phone =
        typeof merged.phone === "string" && merged.phone ? merged.phone : null;
    const stripeCustomerId =
        typeof merged.stripeCustomerId === "string" && merged.stripeCustomerId
            ? merged.stripeCustomerId
            : null;
    const subscription =
        merged.subscription && typeof merged.subscription === "object"
            ? (merged.subscription as AccountDTO["subscription"])
            : null;

    return {
        ...(withoutSignedUrl as unknown as Omit<AccountDTO, "avatarUrl">),
        phone,
        avatar,
        preferences: resolvePreferences(merged.preferences),
        stripeCustomerId,
        subscription,
    };
}

/**
 * An event where an operator acted carries that operator's e-mail in `actorLabel`.
 * Handing it to the data subject would answer one person's request with another
 * person's data, so the export keeps the role and drops the name.
 */
function toExportRecord(
    event: AuditEventDTO,
    profileId: string
): AccountDataExportRecord {
    return {
        action: event.action,
        actorRole: event.actorUserId === profileId ? "self" : "operator",
        createdAt: event.createdAt,
        requestId: event.requestId,
    };
}

async function readStorageObjects(
    profileId: string
): Promise<{ path: string }[]> {
    if (!isStorageConfigured()) {
        return [];
    }

    try {
        const paths = await listObjectPaths(ownerPrefix(profileId));
        return paths.map((path) => ({ path }));
    } catch {
        // A bucket that refuses to list costs the file one section, not the export.
        logEvent("storage", "list-failed", { resource: "account-export" });
        return [];
    }
}

export async function buildAccountDataExport(
    profile: UserDTO
): Promise<AccountDataExportDTO> {
    const merged = await getMergedUserByFirestoreDocId(profile.id);
    if (!merged) {
        throw new AccountExportProfileMissingError(profile.id);
    }

    const [entities, auditEvents, storageObjects] = await Promise.all([
        entityRepository.findAllByUserId(profile.id, EXPORT_MAX_RECORDS),
        auditEventRepository.findAllByInvolvedUserId(
            profile.id,
            EXPORT_MAX_RECORDS
        ),
        readStorageObjects(profile.id),
    ]);

    return {
        generatedAt: new Date().toISOString(),
        format: EXPORT_FORMAT,
        subject: { profileId: profile.id, uid: profile.reference_id },
        account: toExportAccount(merged),
        records: {
            entities: entities.items,
            truncated: entities.truncated,
        },
        auditEvents: {
            items: auditEvents.items.map((event) =>
                toExportRecord(event, profile.id)
            ),
            truncated: auditEvents.truncated,
        },
        storageObjects,
    };
}
