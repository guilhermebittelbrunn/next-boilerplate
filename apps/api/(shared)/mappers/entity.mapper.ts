import type { EntityDTO, EntityType } from "@repo/sdk/src/types";
import type { AllOptional } from "@repo/shared/utils";
import { normalizeFirestoreInstant, stringIfExists } from "@repo/shared/utils";
import Mapper from "./Mapper";

/** Firestore row merged with document id (no separate domain model). */
export type EntityFirestoreRow = Record<string, unknown> & { id: string };

class BaseEntityMapper extends Mapper<EntityFirestoreRow, EntityDTO> {
    toDTO(entity: EntityFirestoreRow): EntityDTO {
        const { id, ...raw } = entity;
        const record = raw as Record<string, unknown>;
        return {
            id,
            userId: String(record.userId ?? ""),
            name: String(record.name ?? ""),
            description: String(record.description ?? ""),
            type: record.type as EntityType,
            photo: stringIfExists(record.photo),
            genre: stringIfExists(record.genre),
            birthdate: stringIfExists(record.birthdate),
            enabled: Boolean(record.enabled ?? true),
            createdAt: normalizeFirestoreInstant(record.createdAt),
            updatedAt: normalizeFirestoreInstant(record.updatedAt),
            deletedAt:
                record.deletedAt == null
                    ? null
                    : normalizeFirestoreInstant(record.deletedAt),
        };
    }

    toPersistence(
        input: AllOptional<EntityDTO>
    ): AllOptional<Record<string, unknown>> {
        const out: Record<string, unknown> = {};
        const keys: (keyof EntityDTO)[] = [
            "userId",
            "name",
            "description",
            "type",
            "photo",
            "genre",
            "birthdate",
            "enabled",
        ];
        for (const key of keys) {
            if (input[key] !== undefined) {
                out[key as string] = input[key] as unknown;
            }
        }
        return out as AllOptional<Record<string, unknown>>;
    }
}

export const entityMapper = new BaseEntityMapper();
