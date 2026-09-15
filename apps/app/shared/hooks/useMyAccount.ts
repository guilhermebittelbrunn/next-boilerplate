import type { AccountDTO } from "@repo/sdk/src/types";
import { useAuthorizedQuery } from "@/shared/hooks/useAuthorizedQuery";
import { apiClient } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/queryKeys";

export function fetchMyAccount(): Promise<AccountDTO> {
    return apiClient.account.me();
}

export function useMyAccount() {
    const { data, isLoading, isError } = useAuthorizedQuery({
        queryKey: queryKeys.account.me(),
        queryFn: fetchMyAccount,
    });

    return { data, isLoading, isError };
}
