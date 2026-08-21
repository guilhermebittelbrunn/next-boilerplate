"use client";

import {
    type QueryKey,
    type UseQueryOptions,
    type UseQueryResult,
    useQuery,
} from "@tanstack/react-query";
import { usePanelState } from "@/shared/stores/panelStore";

/**
 * `useQuery` for data the API only serves to an authenticated caller.
 *
 * It withholds the request until the SDK carries the bearer token. A query that fires
 * first comes back 401 and React Query caches that failure, which is how the
 * impersonation picker ended up permanently empty — and therefore permanently disabled.
 *
 * ⚠️ Use this, not `useQuery`, in every hook that reads authenticated data. Gating a
 * single hook by hand is what left the entities list still firing a 401 on cold load.
 */
export function useAuthorizedQuery<
    TQueryFnData,
    TError = Error,
    TData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey,
>(
    options: UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>
): UseQueryResult<TData, TError> {
    const sdkAuthorized = usePanelState((state) => state.sdkAuthorized);

    return useQuery({
        ...options,
        enabled: (options.enabled ?? true) && sdkAuthorized,
    });
}
