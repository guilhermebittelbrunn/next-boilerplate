import type { OrganizationMemberDTO } from "@repo/sdk/src/types";
import { useAuthorizedQuery } from "@/shared/hooks/useAuthorizedQuery";
import { apiClient } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/queryKeys";

export function fetchOrganizationMembersList(): Promise<
    OrganizationMemberDTO[]
> {
    return apiClient.organization.listMembers();
}

export function useListOrganizationMembers() {
    const { data, isLoading, isFetching, error, refetch } = useAuthorizedQuery({
        queryKey: queryKeys.organization.members(),
        queryFn: fetchOrganizationMembersList,
    });

    return { data, isLoading, isFetching, error, refetch };
}
