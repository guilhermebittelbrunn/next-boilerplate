import type { UserActivitySummaryDTO } from "@repo/sdk/src/types";
import { useAuthorizedQuery } from "@/shared/hooks/useAuthorizedQuery";
import { apiClient } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/queryKeys";

export function fetchUserActivitySummary(): Promise<UserActivitySummaryDTO> {
    return apiClient.user.activitySummary();
}

export const useUserActivitySummary = () => {
    const query = useAuthorizedQuery({
        queryKey: queryKeys.users.activitySummary(),
        queryFn: fetchUserActivitySummary,
    });

    return {
        data: query.data,
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
    };
};
