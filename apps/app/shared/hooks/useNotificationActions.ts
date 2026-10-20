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
 * know, so there is nothing to invalidate. Notifications that were not loaded yet arrive
 * already read from the server.
 */
export const useNotificationActions = () => {
    const { errorAlert } = useAlert();
    const { locale } = getDictionary();
    const queryClient = useQueryClient();

    const snapshotCache = async (): Promise<NotificationCacheSnapshot> => {
        await queryClient.cancelQueries({
            queryKey: queryKeys.notifications.all,
        });
        return {
            previousList: queryClient.getQueryData<NotificationListPages>(
                queryKeys.notifications.list()
            ),
            previousCount: queryClient.getQueryData<NotificationUnreadCountDTO>(
                queryKeys.notifications.unreadCount()
            ),
        };
    };

    const restoreCache = (
        error: unknown,
        context: NotificationCacheSnapshot | undefined
    ) => {
        if (context?.previousList) {
            queryClient.setQueryData(
                queryKeys.notifications.list(),
                context.previousList
            );
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

            queryClient.setQueryData<NotificationListPages>(
                queryKeys.notifications.list(),
                (old) =>
                    markItems(
                        old,
                        (item) => item.id === id && item.readAt === null,
                        new Date().toISOString()
                    )
            );
            if (wasUnread) {
                queryClient.setQueryData<NotificationUnreadCountDTO>(
                    queryKeys.notifications.unreadCount(),
                    (old) => old && { count: Math.max(0, old.count - 1) }
                );
            }
            return snapshot;
        },
        onSuccess: (response) => {
            queryClient.setQueryData<NotificationListPages>(
                queryKeys.notifications.list(),
                (old) =>
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
            queryClient.setQueryData<NotificationListPages>(
                queryKeys.notifications.list(),
                (old) =>
                    markItems(
                        old,
                        (item) => item.readAt === null,
                        new Date().toISOString()
                    )
            );
            queryClient.setQueryData<NotificationUnreadCountDTO>(
                queryKeys.notifications.unreadCount(),
                { count: 0 }
            );
            return snapshot;
        },
        onError: (error, _variables, context) => restoreCache(error, context),
    });

    return { markRead, markAllRead };
};
