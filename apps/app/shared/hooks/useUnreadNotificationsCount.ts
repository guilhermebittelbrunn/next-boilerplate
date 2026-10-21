import type { NotificationUnreadCountDTO } from "@repo/sdk/src/types";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useAuthorizedQuery } from "@/shared/hooks/useAuthorizedQuery";
import { markNotificationsListStale } from "@/shared/hooks/useListNotifications";
import { apiClient } from "@/shared/lib/client";
import { NOTIFICATIONS_POLL_INTERVAL_MS } from "@/shared/lib/pagination";
import { queryKeys } from "@/shared/lib/queryKeys";

const UNREAD_COUNT_STALE_MS = 30_000;

export function fetchUnreadNotificationsCount(): Promise<NotificationUnreadCountDTO> {
    return apiClient.notification.unreadCount();
}

/**
 * Polls only while the tab is visible, refreshes on returning to the tab, and on a route
 * change when the number is older than the stale window. The bell lives in the layout, so
 * it never remounts on navigation and `refetchOnMount` would not fire.
 */
export const useUnreadNotificationsCount = () => {
    const queryClient = useQueryClient();
    const pathname = usePathname();
    const previousPathname = useRef(pathname);

    const query = useAuthorizedQuery({
        queryKey: queryKeys.notifications.unreadCount(),
        queryFn: async () => {
            const known = queryClient.getQueryData<NotificationUnreadCountDTO>(
                queryKeys.notifications.unreadCount()
            );
            const latest = await fetchUnreadNotificationsCount();
            // Mark-as-read writes the count optimistically and keeps the list in step, so
            // only a server answer that disagrees with the cache means the list moved.
            if (known && known.count !== latest.count) {
                markNotificationsListStale(queryClient);
            }
            return latest;
        },
        staleTime: UNREAD_COUNT_STALE_MS,
        refetchInterval: NOTIFICATIONS_POLL_INTERVAL_MS,
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: true,
    });

    useEffect(() => {
        if (previousPathname.current === pathname) {
            return;
        }
        previousPathname.current = pathname;
        queryClient.refetchQueries(
            {
                queryKey: queryKeys.notifications.unreadCount(),
                type: "active",
                stale: true,
            },
            { cancelRefetch: false }
        );
    }, [pathname, queryClient]);

    return {
        count: query.isError ? 0 : (query.data?.count ?? 0),
        isLoading: query.isLoading,
        error: query.error,
    };
};
