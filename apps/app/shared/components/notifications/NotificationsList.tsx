"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import {
    ItemGroup,
    ItemSeparator,
} from "@repo/design-system/components/ui/item";
import { Skeleton } from "@repo/design-system/components/ui/skeleton";
import { getDictionary } from "@repo/internationalization/client";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import { BellOffIcon, CircleAlertIcon } from "lucide-react";
import { Fragment } from "react";
import { useListNotifications } from "@/shared/hooks/useListNotifications";
import { useNotificationActions } from "@/shared/hooks/useNotificationActions";
import { useAuthRequestPanel } from "@/shared/providers/AuthRequestPanelContext";
import { NotificationItem } from "./NotificationItem";

const SKELETON_ROWS = ["first", "second", "third"];

type NotificationsListProps = {
    open: boolean;
    unreadCount: number;
    onNavigate: () => void;
};

export function NotificationsList({
    open,
    unreadCount,
    onNavigate,
}: NotificationsListProps) {
    const { dictionary, locale } = getDictionary();
    const notificationsCopy = dictionary.apps.app.shared.notifications;
    const { isImpersonating } = useAuthRequestPanel();
    const list = useListNotifications({ enabled: open });
    const { markRead, markAllRead } = useNotificationActions();

    const hasUnreadLoaded = list.data.some((item) => item.readAt === null);
    const canMarkAll = unreadCount > 0 || hasUnreadLoaded;

    const renderBody = () => {
        if (list.isLoading) {
            return (
                <div aria-busy="true" className="flex flex-col divide-y">
                    {SKELETON_ROWS.map((row) => (
                        <div className="flex gap-3 px-4 py-3" key={row}>
                            <Skeleton className="size-4 shrink-0 rounded-sm" />
                            <div className="flex flex-1 flex-col gap-2">
                                <Skeleton className="h-4 w-3/5" />
                                <Skeleton className="h-3 w-full" />
                                <Skeleton className="h-3 w-24" />
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        if (list.error) {
            return (
                <div className="flex flex-col items-center gap-3 p-6 text-center">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                        <CircleAlertIcon
                            aria-hidden="true"
                            className="size-5"
                        />
                    </span>
                    <p
                        className="max-w-xs text-pretty text-muted-foreground text-sm"
                        role="alert"
                    >
                        {handleClientError(
                            new FormattedError(list.error, locale)
                        )}
                    </p>
                    <Button
                        onClick={() => list.refetch()}
                        size="sm"
                        variant="outline"
                    >
                        {notificationsCopy.retry}
                    </Button>
                </div>
            );
        }

        if (list.data.length === 0) {
            return (
                <Empty className="p-6 md:p-6">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <BellOffIcon aria-hidden="true" />
                        </EmptyMedia>
                        <EmptyTitle>{notificationsCopy.emptyTitle}</EmptyTitle>
                        <EmptyDescription>
                            {notificationsCopy.emptyDescription}
                        </EmptyDescription>
                    </EmptyHeader>
                </Empty>
            );
        }

        return (
            <ItemGroup>
                {list.data.map((notification, index) => (
                    <Fragment key={notification.id}>
                        {index > 0 && <ItemSeparator />}
                        <NotificationItem
                            copy={notificationsCopy}
                            locale={locale}
                            markPending={markRead.isPending}
                            notification={notification}
                            onMarkRead={(id) => markRead.mutate(id)}
                            onNavigate={onNavigate}
                            readOnly={isImpersonating}
                        />
                    </Fragment>
                ))}
                {list.hasNextPage && (
                    <div className="p-2">
                        <Button
                            className="w-full"
                            loading={list.isFetchingNextPage}
                            onClick={() => list.fetchNextPage()}
                            size="sm"
                            variant="ghost"
                        >
                            {notificationsCopy.loadMore}
                        </Button>
                    </div>
                )}
            </ItemGroup>
        );
    };

    return (
        <div className="flex flex-col">
            <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
                <h2 className="font-semibold text-sm tracking-tight">
                    {notificationsCopy.title}
                </h2>
                <Button
                    disabled={isImpersonating || !canMarkAll}
                    loading={markAllRead.isPending}
                    onClick={() => markAllRead.mutate()}
                    size="xs"
                    variant="ghost"
                >
                    {notificationsCopy.markAllRead}
                </Button>
            </div>
            {isImpersonating && (
                <p className="text-pretty border-b bg-muted/40 px-4 py-2 text-muted-foreground text-xs">
                    {notificationsCopy.readOnlyHint}
                </p>
            )}
            <div className="max-h-[min(28rem,60vh)] overflow-y-auto overscroll-contain">
                {renderBody()}
            </div>
        </div>
    );
}
