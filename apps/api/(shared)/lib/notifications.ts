import type {
    NotificationParamsByType,
    NotificationType,
} from "@repo/sdk/src/types";
import { logEvent } from "@repo/shared/utils/helpers/log";
import { notificationRepository } from "../repositories/notification.repository";

export const NOTIFICATION_RETENTION_DAYS = 90;
const MS_PER_DAY = 86_400_000;

export type EmitNotificationInput<T extends NotificationType> = {
    userId: string;
    type: T;
    params: NotificationParamsByType[T];
    /** Same key, same notification: a producer that runs twice cannot notify twice. */
    dedupeKey?: string;
};

/** Server-only: the owner always comes from a profile the server resolved, never from a client. */
export function emitNotification<T extends NotificationType>(
    input: EmitNotificationInput<T>,
    now: Date = new Date()
): Promise<"created" | "duplicate"> {
    return notificationRepository.emitOnce(
        {
            userId: input.userId,
            type: input.type,
            params: input.params,
            createdAt: now,
            expiresAt: new Date(
                now.getTime() + NOTIFICATION_RETENTION_DAYS * MS_PER_DAY
            ),
        },
        input.dedupeKey ? `${input.type}_${input.dedupeKey}` : null
    );
}

/** For producers whose own work must not fail because a notice could not be stored. */
export async function emitNotificationQuietly<T extends NotificationType>(
    input: EmitNotificationInput<T>
): Promise<void> {
    try {
        await emitNotification(input);
    } catch (error) {
        // Only the error name: a Firestore message echoes document paths and payloads.
        logEvent("notifications", "emit-failed", {
            type: input.type,
            reason: error instanceof Error ? error.name : "unknown",
        });
    }
}
