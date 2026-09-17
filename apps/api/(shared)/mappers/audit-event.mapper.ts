import type {
    AuditAction,
    AuditEventDTO,
    AuditTargetType,
} from "@repo/sdk/src/types";
import type { AllOptional } from "@repo/shared/utils";
import { normalizeFirestoreInstant, stringIfExists } from "@repo/shared/utils";
import Mapper from "./Mapper";

/** Firestore row merged with document id (no separate domain model). */
export type AuditEventFirestoreRow = Record<string, unknown> & { id: string };

function stringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.filter((item): item is string => typeof item === "string");
}

class BaseAuditEventMapper extends Mapper<
    AuditEventFirestoreRow,
    AuditEventDTO
> {
    toDTO(entity: AuditEventFirestoreRow): AuditEventDTO {
        const { id, ...raw } = entity;
        const record = raw as Record<string, unknown>;
        return {
            id,
            action: record.action as AuditAction,
            actorUserId: String(record.actorUserId ?? ""),
            actorUid: String(record.actorUid ?? ""),
            actorLabel: stringIfExists(record.actorLabel),
            onBehalfOfUserId: stringIfExists(record.onBehalfOfUserId),
            targetType: record.targetType as AuditTargetType,
            targetUserId: stringIfExists(record.targetUserId),
            targetLabel: stringIfExists(record.targetLabel),
            changedFields: stringArray(record.changedFields),
            involvedUserIds: stringArray(record.involvedUserIds),
            requestId: stringIfExists(record.requestId),
            windowEndsAt:
                record.windowEndsAt == null
                    ? null
                    : normalizeFirestoreInstant(record.windowEndsAt),
            createdAt: normalizeFirestoreInstant(record.createdAt),
            updatedAt: normalizeFirestoreInstant(record.updatedAt),
            deletedAt:
                record.deletedAt == null
                    ? null
                    : normalizeFirestoreInstant(record.deletedAt),
        };
    }

    toPersistence(
        input: AllOptional<AuditEventDTO>
    ): AllOptional<Record<string, unknown>> {
        const out: Record<string, unknown> = {};
        const keys: (keyof AuditEventDTO)[] = [
            "action",
            "actorUserId",
            "actorUid",
            "actorLabel",
            "onBehalfOfUserId",
            "targetType",
            "targetUserId",
            "targetLabel",
            "changedFields",
            "involvedUserIds",
            "requestId",
            "windowEndsAt",
        ];
        for (const key of keys) {
            if (input[key] !== undefined) {
                out[key as string] = input[key] as unknown;
            }
        }
        return out as AllOptional<Record<string, unknown>>;
    }
}

export const auditEventMapper = new BaseAuditEventMapper();
