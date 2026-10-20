import type { NotificationDTO, PageDTO, PageQuery } from "@repo/sdk/src/types";
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

/** `enabled` follows the popover: the list is read only when someone opens it. */
export const useListNotifications = ({ enabled }: { enabled: boolean }) => {
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
        fetchNextPage: query.fetchNextPage,
        hasNextPage: query.hasNextPage,
        isFetchingNextPage: query.isFetchingNextPage,
    };
};
