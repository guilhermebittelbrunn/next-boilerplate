import type { EntityDTO } from "@repo/sdk/src/types";
import { useAuthorizedQuery } from "@/shared/hooks/useAuthorizedQuery";
import { apiClient } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/queryKeys";

export function fetchEntitiesList(): Promise<EntityDTO[]> {
    return apiClient.entity.list();
}

export const useListEntities = () => {
    const { data, isLoading, error, refetch, isFetching } = useAuthorizedQuery({
        queryKey: queryKeys.entities.list(),
        queryFn: fetchEntitiesList,
    });

    return { data, isLoading, error, refetch, isFetching };
};
