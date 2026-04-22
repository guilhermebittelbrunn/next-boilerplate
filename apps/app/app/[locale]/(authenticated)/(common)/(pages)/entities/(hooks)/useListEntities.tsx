/** biome-ignore-all lint/style/useFilenamingConvention: matches admin users colocated modules */
/** biome-ignore-all lint/suspicious/useAwait: <explanation> */
import type { EntityDTO } from "@repo/sdk/src/types";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/client";

export const LIST_ENTITIES_QUERY_KEY = "list-entities";

export async function fetchEntitiesList(): Promise<EntityDTO[]> {
    return apiClient.entity.list();
}

export const useListEntities = () => {
    const { data, isLoading, error, refetch, isFetching } = useQuery({
        queryKey: [LIST_ENTITIES_QUERY_KEY],
        queryFn: fetchEntitiesList,
    });

    return { data, isLoading, error, refetch, isFetching };
};
