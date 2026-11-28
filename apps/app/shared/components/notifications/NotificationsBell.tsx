"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@repo/design-system/components/ui/popover";
import { getDictionary } from "@repo/internationalization/client";
import { NOTIFICATION_UNREAD_COUNT_CAP } from "@repo/sdk/src/types";
import { BellIcon } from "lucide-react";
import { useState } from "react";
import { useUnreadNotificationsCount } from "@/shared/hooks/useUnreadNotificationsCount";
import { NotificationsList } from "./NotificationsList";

const POPOVER_EDGE_GAP_PX = 12;

export function formatUnreadBadge(count: number): string {
    return count >= NOTIFICATION_UNREAD_COUNT_CAP
        ? `${NOTIFICATION_UNREAD_COUNT_CAP - 1}+`
        : String(count);
}

export default function NotificationsBell() {
    const { dictionary } = getDictionary();
    const notificationsCopy = dictionary.apps.app.shared.notifications;
    const [open, setOpen] = useState(false);
    const { count } = useUnreadNotificationsCount();

    const triggerLabel =
        count > 0
            ? notificationsCopy.triggerLabelUnread.replace(
                  "{count}",
                  formatUnreadBadge(count)
              )
            : notificationsCopy.triggerLabel;

    return (
        <Popover onOpenChange={setOpen} open={open}>
            <PopoverTrigger asChild>
                <Button
                    aria-label={triggerLabel}
                    className="pressable relative size-9 shrink-0 rounded-md p-0 text-muted-foreground hover:bg-accent hover:text-foreground"
                    size="icon"
                    variant="ghost"
                >
                    <BellIcon
                        aria-hidden="true"
                        className="h-[1.2rem] w-[1.2rem]"
                    />
                    {count > 0 && (
                        <Badge
                            aria-hidden="true"
                            className="-top-0.5 -right-0.5 absolute h-4 min-w-4 bg-primary px-1 text-[0.625rem] text-primary-foreground leading-none ring-2 ring-background dark:bg-primary"
                            data-testid="notifications-badge"
                        >
                            {formatUnreadBadge(count)}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                className="w-[min(24rem,calc(100vw-1.5rem))] p-0"
                collisionPadding={POPOVER_EDGE_GAP_PX}
            >
                <NotificationsList
                    onNavigate={() => setOpen(false)}
                    open={open}
                    unreadCount={count}
                />
            </PopoverContent>
        </Popover>
    );
}
