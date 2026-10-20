import type {
    NotificationDTO,
    NotificationParamValue,
} from "@repo/sdk/src/types";
import type { AllOptional } from "@repo/shared/utils";
import { normalizeFirestoreInstant } from "@repo/shared/utils";
import Mapper from "./Mapper";

export type NotificationFirestoreRow = Record<string, unknown> & {
    id: string;
};

function instantOrNull(value: unknown): string | null {
    return value == null ? null : normalizeFirestoreInstant(value);
}

function isParamValue(value: unknown): value is NotificationParamValue {
    return (
        value === null ||
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
    );
}

/** Only flat values can be interpolated into copy; anything nested is dropped on read. */
function primitiveParams(raw: unknown): Record<string, NotificationParamValue> {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
        return {};
    }

    const params: Record<string, NotificationParamValue> = {};
    for (const [key, value] of Object.entries(raw)) {
        if (isParamValue(value)) {
            params[key] = value;
        }
    }
    return params;
}

class NotificationMapper extends Mapper<
    NotificationFirestoreRow,
    NotificationDTO
> {
    toDTO(row: NotificationFirestoreRow): NotificationDTO {
        const { id, ...record } = row;
        return {
            id,
            userId: String(record.userId ?? ""),
            type: String(record.type ?? ""),
            params: primitiveParams(record.params),
            readAt: instantOrNull(record.readAt),
            expiresAt: instantOrNull(record.expiresAt),
            createdAt: normalizeFirestoreInstant(record.createdAt),
            updatedAt: normalizeFirestoreInstant(record.updatedAt),
            deletedAt: instantOrNull(record.deletedAt),
        };
    }

    toPersistence(
        input: AllOptional<NotificationDTO>
    ): AllOptional<Record<string, unknown>> {
        const out: Record<string, unknown> = {};
        const keys: (keyof NotificationDTO)[] = [
            "userId",
            "type",
            "params",
            "readAt",
            "expiresAt",
        ];
        for (const key of keys) {
            if (input[key] !== undefined) {
                out[key] = input[key];
            }
        }
        return out as AllOptional<Record<string, unknown>>;
    }
}

export const notificationMapper = new NotificationMapper();
