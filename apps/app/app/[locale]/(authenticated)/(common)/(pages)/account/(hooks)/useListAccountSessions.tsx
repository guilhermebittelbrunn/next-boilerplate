import type { AccountSessionDTO } from "@repo/sdk/src/types";
import { useAuthorizedQuery } from "@/shared/hooks/useAuthorizedQuery";
import { apiClient } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/queryKeys";

export function fetchAccountSessionsList(): Promise<AccountSessionDTO[]> {
    return apiClient.account.listSessions();
}

export function useListAccountSessions() {
    const { data, isLoading, isFetching, error, refetch } = useAuthorizedQuery({
        queryKey: queryKeys.account.sessions(),
        queryFn: fetchAccountSessionsList,
    });

    return { data, isLoading, isFetching, error, refetch };
}
