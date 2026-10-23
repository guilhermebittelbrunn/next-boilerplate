import type { OrganizationInvitationDTO } from "@repo/sdk/src/types";
import { useAuthorizedQuery } from "@/shared/hooks/useAuthorizedQuery";
import { apiClient } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/queryKeys";

export function fetchOrganizationInvitationsList(): Promise<
    OrganizationInvitationDTO[]
> {
    return apiClient.organization.listInvitations();
}

/** Only the owner may read invitations; a member would get a 403 cached as an error. */
export function useListOrganizationInvitations(isOwner: boolean) {
    const { data, isLoading, isFetching, error, refetch } = useAuthorizedQuery({
        queryKey: queryKeys.organization.invitations(),
        queryFn: fetchOrganizationInvitationsList,
        enabled: isOwner,
    });

    return { data, isLoading, isFetching, error, refetch };
}
