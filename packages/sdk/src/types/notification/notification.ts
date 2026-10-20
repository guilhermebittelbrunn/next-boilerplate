export const NOTIFICATION_TYPES = [
    "welcome",
    "subscriptionPaymentPending",
    "subscriptionCanceled",
    "subscriptionReactivated",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export type NotificationParamValue = string | number | boolean | null;

/**
 * The values each type's copy interpolates. A notification carries a type and these
 * values, never ready-made text: the reader's dictionary turns them into words.
 */
export type NotificationParamsByType = {
    welcome: Record<string, never>;
    subscriptionPaymentPending: Record<string, never>;
    subscriptionCanceled: Record<string, never>;
    subscriptionReactivated: Record<string, never>;
};

/** The API counts unread notifications up to this number; the badge reads `99+` from here on. */
export const NOTIFICATION_UNREAD_COUNT_CAP = 100;

export type NotificationDTO = {
    id: string;
    userId: string;
    /** A type this build does not know still reads, so the client can fall back to generic copy. */
    type: string;
    params: Record<string, NotificationParamValue>;
    readAt: string | null;
    expiresAt: string | null;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
};

export type NotificationUnreadCountDTO = { count: number };

export type MarkNotificationReadResponse = { id: string; readAt: string };

export type MarkAllNotificationsReadResponse = { updated: number };
