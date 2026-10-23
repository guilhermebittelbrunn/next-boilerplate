import type { OrganizationDTO } from "@repo/sdk/src/types";
import { useAuthorizedQuery } from "@/shared/hooks/useAuthorizedQuery";
import { apiClient } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/queryKeys";

export function fetchOrganization(): Promise<OrganizationDTO> {
    return apiClient.organization.get();
}

export function useOrganization() {
    const { data, isLoading, error } = useAuthorizedQuery({
        queryKey: queryKeys.organization.detail(),
        queryFn: fetchOrganization,
    });

    return { data, isLoading, error };
}
