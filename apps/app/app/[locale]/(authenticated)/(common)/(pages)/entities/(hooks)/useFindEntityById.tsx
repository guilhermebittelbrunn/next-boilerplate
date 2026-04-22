/** biome-ignore-all lint/style/useFilenamingConvention: matches admin users colocated modules */
import type { EntityDTO } from "@repo/sdk/src/types";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/client";

export const FIND_ENTITY_BY_ID_QUERY_KEY = "find-entity-by-id";

export async function findEntityById(
    id: string | undefined
): Promise<EntityDTO | undefined> {
    if (!id) {
        return;
    }
    return await apiClient.entity.findById(id);
}

export function useFindEntityById(id: string | undefined) {
    const { data, isLoading, isError } = useQuery({
        queryKey: [FIND_ENTITY_BY_ID_QUERY_KEY, id],
        queryFn: () => findEntityById(id),
        enabled: Boolean(id),
    });

    return { data, isLoading, isError };
}
