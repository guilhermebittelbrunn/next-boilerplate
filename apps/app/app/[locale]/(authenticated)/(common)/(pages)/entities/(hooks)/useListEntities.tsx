import type { EntityDTO, PageDTO, PageQuery } from "@repo/sdk/src/types";
import { useMemo } from "react";
import { useAuthorizedInfiniteQuery } from "@/shared/hooks/useAuthorizedInfiniteQuery";
import { apiClient } from "@/shared/lib/client";
import { ENTITIES_PAGE_SIZE } from "@/shared/lib/pagination";
import { queryKeys } from "@/shared/lib/queryKeys";

export function fetchEntitiesList(
    query?: PageQuery
): Promise<PageDTO<EntityDTO>> {
    return apiClient.entity.list(query);
}

export const useListEntities = () => {
    const query = useAuthorizedInfiniteQuery({
        queryKey: queryKeys.entities.list(),
        queryFn: ({ pageParam }: { pageParam: string | null }) =>
            fetchEntitiesList({
                limit: ENTITIES_PAGE_SIZE,
                cursor: pageParam,
            }),
        initialPageParam: null as string | null,
        getNextPageParam: (lastPage: PageDTO<EntityDTO>) => lastPage.nextCursor,
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
