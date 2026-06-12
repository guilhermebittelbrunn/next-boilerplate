/** biome-ignore-all lint/style/useFilenamingConvention: matches admin users colocated modules */
import type { EntityDTO } from "@repo/sdk/src/types";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/queryKeys";

export function fetchEntitiesList(): Promise<EntityDTO[]> {
    return apiClient.entity.list();
}

export const useListEntities = () => {
    const { data, isLoading, error, refetch, isFetching } = useQuery({
        queryKey: queryKeys.entities.list(),
        queryFn: fetchEntitiesList,
    });

    return { data, isLoading, error, refetch, isFetching };
};
