import useAlert from "@repo/design-system/hooks/useAlert";
import { getDictionary } from "@repo/internationalization/client";
import type {
    NotificationDTO,
    NotificationUnreadCountDTO,
    PageDTO,
} from "@repo/sdk/src/types";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import {
    type InfiniteData,
    useMutation,
    useQueryClient,
} from "@tanstack/react-query";
import {
    isNotificationsListStale,
    markNotificationsListStale,
} from "@/shared/hooks/useListNotifications";
import { apiClient } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/queryKeys";

type NotificationListPages = InfiniteData<PageDTO<NotificationDTO>>;

type NotificationCacheSnapshot = {
    previousList?: NotificationListPages;
    previousCount?: NotificationUnreadCountDTO;
};

function markItems(
    list: NotificationListPages | undefined,
    shouldMark: (item: NotificationDTO) => boolean,
    readAt: string
): NotificationListPages | undefined {
    return (
        list && {
            ...list,
            pages: list.pages.map((page) => ({
                ...page,
                items: page.items.map((item) =>
                    shouldMark(item) ? { ...item, readAt } : item
                ),
            })),
        }
    );
}

/**
 * Optimistic and cache-only: the server changes nothing the client does not already
 * know, so nothing is read again on its account. Notifications that were not loaded yet
 * arrive already read from the server.
 */
export const useNotificationActions = () => {
    const { errorAlert } = useAlert();
    const { locale } = getDictionary();
    const queryClient = useQueryClient();

    const writeList = (
        update: (
            old: NotificationListPages | undefined
        ) => NotificationListPages | undefined
    ) => {
        const listWasStale = isNotificationsListStale(queryClient);
        queryClient.setQueryData<NotificationListPages>(
            queryKeys.notifications.list(),
            update
        );
        if (listWasStale) {
            markNotificationsListStale(queryClient);
        }
    };

    const snapshotCache = async (): Promise<NotificationCacheSnapshot> => {
        await queryClient.cancelQueries({
            queryKey: queryKeys.notifications.all,
        });
        // Writing the count clears its error state and would bring back the number the
        // badge hid after a failed read.
        const countIsCurrent =
            queryClient.getQueryState(queryKeys.notifications.unreadCount())
                ?.status === "success";
        return {
            previousList: queryClient.getQueryData<NotificationListPages>(
                queryKeys.notifications.list()
            ),
            previousCount: countIsCurrent
                ? queryClient.getQueryData<NotificationUnreadCountDTO>(
                      queryKeys.notifications.unreadCount()
                  )
                : undefined,
        };
    };

    const restoreCache = (
        error: unknown,
        context: NotificationCacheSnapshot | undefined
    ) => {
        const previousList = context?.previousList;
        if (previousList) {
            writeList(() => previousList);
        }
        if (context?.previousCount) {
            queryClient.setQueryData(
                queryKeys.notifications.unreadCount(),
                context.previousCount
            );
        }
        errorAlert(handleClientError(new FormattedError(error, locale)));
    };

    const markRead = useMutation({
        mutationFn: (id: string) => apiClient.notification.markRead(id),
        onMutate: async (id: string) => {
            const snapshot = await snapshotCache();
            const target = snapshot.previousList?.pages
                .flatMap((page) => page.items)
                .find((item) => item.id === id);
            const wasUnread = target ? target.readAt === null : true;

            writeList((old) =>
                markItems(
                    old,
                    (item) => item.id === id && item.readAt === null,
                    new Date().toISOString()
                )
            );
            if (wasUnread && snapshot.previousCount) {
                queryClient.setQueryData<NotificationUnreadCountDTO>(
                    queryKeys.notifications.unreadCount(),
                    (old) => old && { count: Math.max(0, old.count - 1) }
                );
            }
            return snapshot;
        },
        onSuccess: (response) => {
            writeList((old) =>
                markItems(
                    old,
                    (item) => item.id === response.id,
                    response.readAt
                )
            );
        },
        onError: (error, _id, context) => restoreCache(error, context),
    });

    const markAllRead = useMutation({
        mutationFn: () => apiClient.notification.markAllRead(),
        onMutate: async () => {
            const snapshot = await snapshotCache();
            writeList((old) =>
                markItems(
                    old,
                    (item) => item.readAt === null,
                    new Date().toISOString()
                )
            );
            if (snapshot.previousCount) {
                queryClient.setQueryData<NotificationUnreadCountDTO>(
                    queryKeys.notifications.unreadCount(),
                    { count: 0 }
                );
            }
            return snapshot;
        },
        onError: (error, _variables, context) => restoreCache(error, context),
    });

    return { markRead, markAllRead };
};
