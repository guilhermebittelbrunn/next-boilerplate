import type {
    AuditEventDTO,
    AuditEventListQuery,
    PageDTO,
    PageQuery,
} from "@repo/sdk/src/types";
import { useMemo } from "react";
import { useAuthorizedInfiniteQuery } from "@/shared/hooks/useAuthorizedInfiniteQuery";
import { apiClient } from "@/shared/lib/client";
import { AUDIT_EVENTS_PAGE_SIZE } from "@/shared/lib/pagination";
import { queryKeys } from "@/shared/lib/queryKeys";

export type AuditEventFilters = AuditEventListQuery;

export function fetchAuditEventsList(
    query?: PageQuery & AuditEventListQuery
): Promise<PageDTO<AuditEventDTO>> {
    return apiClient.audit.list(query);
}

export const useListAuditEvents = (filters?: AuditEventFilters) => {
    const query = useAuthorizedInfiniteQuery({
        queryKey: queryKeys.auditEvents.list(filters),
        queryFn: ({ pageParam }: { pageParam: string | null }) =>
            fetchAuditEventsList({
                limit: AUDIT_EVENTS_PAGE_SIZE,
                cursor: pageParam,
                ...filters,
            }),
        initialPageParam: null as string | null,
        getNextPageParam: (lastPage: PageDTO<AuditEventDTO>) =>
            lastPage.nextCursor,
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
        isFetching: query.isFetching,
        fetchNextPage: query.fetchNextPage,
        hasNextPage: query.hasNextPage,
        isFetchingNextPage: query.isFetchingNextPage,
    };
};
