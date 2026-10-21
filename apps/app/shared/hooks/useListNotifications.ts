import type { NotificationDTO, PageDTO, PageQuery } from "@repo/sdk/src/types";
import { type QueryClient, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useAuthorizedInfiniteQuery } from "@/shared/hooks/useAuthorizedInfiniteQuery";
import { apiClient } from "@/shared/lib/client";
import { NOTIFICATIONS_PAGE_SIZE } from "@/shared/lib/pagination";
import { queryKeys } from "@/shared/lib/queryKeys";

export function fetchNotificationsList(
    query?: PageQuery
): Promise<PageDTO<NotificationDTO>> {
    return apiClient.notification.list(query);
}

/**
 * A stale list is read again the next time it is opened, not while it is open. Every
 * write to the list (`setQueryData` or loading a page) clears the mark, so whoever writes
 * to it has to put the mark back.
 */
export function isNotificationsListStale(queryClient: QueryClient): boolean {
    return (
        queryClient.getQueryState(queryKeys.notifications.list())
            ?.isInvalidated ?? false
    );
}

export function markNotificationsListStale(queryClient: QueryClient) {
    queryClient.invalidateQueries({
        queryKey: queryKeys.notifications.list(),
        refetchType: "none",
    });
}

/** `enabled` follows the popover: the list is read only when someone opens it. */
export const useListNotifications = ({ enabled }: { enabled: boolean }) => {
    const queryClient = useQueryClient();
    const query = useAuthorizedInfiniteQuery({
        queryKey: queryKeys.notifications.list(),
        queryFn: ({ pageParam }: { pageParam: string | null }) =>
            fetchNotificationsList({
                limit: NOTIFICATIONS_PAGE_SIZE,
                cursor: pageParam,
            }),
        initialPageParam: null as string | null,
        getNextPageParam: (lastPage: PageDTO<NotificationDTO>) =>
            lastPage.nextCursor,
        enabled,
    });

    const data = useMemo(
        () => query.data?.pages.flatMap((page) => page.items) ?? [],
        [query.data]
    );

    return {
        data,
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
        fetchNextPage: async () => {
            const listWasStale = isNotificationsListStale(queryClient);
            const result = await query.fetchNextPage();
            if (listWasStale) {
                markNotificationsListStale(queryClient);
            }
            return result;
        },
        hasNextPage: query.hasNextPage,
        isFetchingNextPage: query.isFetchingNextPage,
    };
};
