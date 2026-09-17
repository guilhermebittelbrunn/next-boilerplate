import type { UserSummaryDTO } from "@repo/sdk/src/types";
import { useAuthorizedQuery } from "@/shared/hooks/useAuthorizedQuery";
import { apiClient } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/queryKeys";

export function fetchUserSummary(): Promise<UserSummaryDTO> {
    return apiClient.user.summary();
}

export const useUserSummary = () => {
    const query = useAuthorizedQuery({
        queryKey: queryKeys.users.summary(),
        queryFn: fetchUserSummary,
    });

    return {
        data: query.data,
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
    };
};
