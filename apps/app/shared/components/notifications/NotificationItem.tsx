"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
    Item,
    ItemActions,
    ItemContent,
    ItemDescription,
    ItemMedia,
    ItemTitle,
} from "@repo/design-system/components/ui/item";
import { cn } from "@repo/design-system/lib/utils";
import type { NotificationDTO } from "@repo/sdk/src/types";
import {
    CheckIcon,
    CircleAlertIcon,
    InfoIcon,
    TriangleAlertIcon,
} from "lucide-react";
import Link from "next/link";
import { useFormatDisplayDateTime } from "@/shared/lib/formatDisplayDateTime";
import {
    describeNotification,
    type NotificationLevel,
    type NotificationsCopy,
    notificationHref,
    notificationLevel,
} from "@/shared/lib/notifications";

const LEVEL_ICONS: Record<NotificationLevel, typeof InfoIcon> = {
    info: InfoIcon,
    warning: TriangleAlertIcon,
    error: CircleAlertIcon,
};

const LEVEL_ICON_CLASSES: Record<NotificationLevel, string> = {
    info: "text-muted-foreground",
    warning: "text-warning",
    error: "text-destructive",
};

type NotificationItemProps = {
    notification: NotificationDTO;
    copy: NotificationsCopy;
    locale: string;
    readOnly: boolean;
    markPending: boolean;
    onMarkRead: (id: string) => void;
    onNavigate: () => void;
};

export function NotificationItem({
    notification,
    copy,
    locale,
    readOnly,
    markPending,
    onMarkRead,
    onNavigate,
}: NotificationItemProps) {
    const formatDateTime = useFormatDisplayDateTime();
    const { title, body } = describeNotification(copy, notification);
    const level = notificationLevel(notification.type);
    const LevelIcon = LEVEL_ICONS[level];
    const href = notificationHref(locale, notification);
    const unread = notification.readAt === null;

    const followLink = () => {
        if (unread && !readOnly) {
            onMarkRead(notification.id);
        }
        onNavigate();
    };

    return (
        <Item
            className={cn("items-start", unread && "bg-muted/50")}
            data-unread={unread || undefined}
            size="sm"
        >
            <ItemMedia className="mt-0.5">
                <LevelIcon
                    aria-hidden="true"
                    className={cn("size-4", LEVEL_ICON_CLASSES[level])}
                />
            </ItemMedia>
            <ItemContent className="min-w-0">
                <ItemTitle className="w-full items-start">
                    {unread && (
                        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary">
                            <span className="sr-only">{copy.unread}</span>
                        </span>
                    )}
                    {href ? (
                        <Link
                            className="min-w-0 underline-offset-4 [overflow-wrap:anywhere] hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
                            href={href}
                            onClick={followLink}
                        >
                            {title}
                        </Link>
                    ) : (
                        <span className="min-w-0 [overflow-wrap:anywhere]">
                            {title}
                        </span>
                    )}
                </ItemTitle>
                <ItemDescription className="line-clamp-3 text-pretty">
                    {body}
                </ItemDescription>
                <time
                    className="text-muted-foreground text-xs tabular-nums"
                    dateTime={notification.createdAt}
                >
                    {formatDateTime(notification.createdAt)}
                </time>
            </ItemContent>
            {unread && (
                <ItemActions>
                    <Button
                        aria-label={copy.markRead}
                        disabled={readOnly || markPending}
                        onClick={() => onMarkRead(notification.id)}
                        size="icon-sm"
                        title={copy.markRead}
                        variant="ghost"
                    >
                        <CheckIcon aria-hidden="true" />
                    </Button>
                </ItemActions>
            )}
        </Item>
    );
}
