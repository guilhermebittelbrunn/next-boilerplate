import type { EntitySummaryDTO } from "@repo/sdk/src/types";
import { useAuthorizedQuery } from "@/shared/hooks/useAuthorizedQuery";
import { apiClient } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/queryKeys";

export function fetchEntitySummary(): Promise<EntitySummaryDTO> {
    return apiClient.entity.summary();
}

export const useEntitySummary = () => {
    const query = useAuthorizedQuery({
        queryKey: queryKeys.entities.summary(),
        queryFn: fetchEntitySummary,
    });

    return {
        data: query.data,
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
    };
};
