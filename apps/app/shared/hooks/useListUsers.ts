"use client";

import { UserRoleLevel } from "@repo/auth/types";
import { UserType, type UserWithAuthDTO } from "@repo/sdk/src/types";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/queryKeys";
import { usePanelState } from "@/shared/stores/panelStore";

type UseListUsersParams = {
    enabled?: boolean;
    type?: UserType;
};

export function fetchUsersList(type?: UserType): Promise<UserWithAuthDTO[]> {
    return apiClient.user.list(type ? { type } : undefined);
}

/**
 * The API scopes the listing both by `?type=` and by the request context: in the common
 * panel it returns only common users, whatever was asked for. The hook mirrors that rule
 * so the query key always describes the data that actually comes back — otherwise a
 * common-area screen would cache an impersonation-scoped list under the admin key.
 */
export function useListUsers(params?: UseListUsersParams) {
    const { enabled = true, type } = params ?? {};
    const profileKind = usePanelState((state) => state.profileKind);
    const panelRequestRole = usePanelState((state) => state.panelRequestRole);

    const effectiveType =
        panelRequestRole === UserRoleLevel.COMMON ? UserType.COMMON : type;

    return useQuery({
        queryKey: queryKeys.users.list(effectiveType),
        queryFn: () => fetchUsersList(effectiveType),
        // No session, no listing. The headers themselves are guaranteed by the provider,
        // which applies them during render before any child can mount.
        enabled: enabled && profileKind !== null,
    });
}
