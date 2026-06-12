"use client";

import type { UserType, UserWithAuthDTO } from "@repo/sdk/src/types";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/queryKeys";

type UseListUsersParams = {
    enabled?: boolean;
    type?: UserType;
};

export function fetchUsersList() {
    return apiClient.user.list();
}

/**
 * Single cached user list (one network call). When `type` is passed, results are
 * filtered in memory via `select` — the cache key stays the same so admin/common
 * consumers share the same fetch.
 */
export function useListUsers(params?: UseListUsersParams) {
    const { enabled = true, type } = params ?? {};

    return useQuery({
        queryKey: queryKeys.users.list(),
        queryFn: fetchUsersList,
        enabled,
        select: (users: UserWithAuthDTO[]) => {
            if (!type) {
                return users;
            }
            return users.filter((user) => user.type === type);
        },
    });
}
