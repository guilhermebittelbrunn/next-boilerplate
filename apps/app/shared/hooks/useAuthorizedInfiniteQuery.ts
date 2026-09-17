"use client";

import {
    type InfiniteData,
    type QueryKey,
    type UseInfiniteQueryOptions,
    type UseInfiniteQueryResult,
    useInfiniteQuery,
} from "@tanstack/react-query";
import { usePanelState } from "@/shared/stores/panelStore";

/**
 * The infinite counterpart of `useAuthorizedQuery`, and it exists for the same reason: a
 * request that fires before the SDK carries the bearer token comes back 401, and React
 * Query caches that failure for the whole key.
 */
export function useAuthorizedInfiniteQuery<
    TQueryFnData,
    TError = Error,
    TData = InfiniteData<TQueryFnData>,
    TQueryKey extends QueryKey = QueryKey,
    TPageParam = unknown,
>(
    options: UseInfiniteQueryOptions<
        TQueryFnData,
        TError,
        TData,
        TQueryKey,
        TPageParam
    >
): UseInfiniteQueryResult<TData, TError> {
    const sdkAuthorized = usePanelState((state) => state.sdkAuthorized);

    return useInfiniteQuery({
        ...options,
        enabled: (options.enabled ?? true) && sdkAuthorized,
    });
}
