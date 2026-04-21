"use client";

import type { UserType, UserWithAuthDTO } from "@repo/sdk/src/types";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/client";

const LIST_USERS_QUERY_KEY = "users";

type UseListUsersParams = {
    enabled?: boolean;
    type?: UserType;
};

export function listUsers() {
    return apiClient.user.list();
}

export function useListUsers(params?: UseListUsersParams) {
    const { enabled = true, type } = params ?? {};

    return useQuery({
        queryKey: [LIST_USERS_QUERY_KEY],
        queryFn: listUsers,
        enabled,
        select: (users: UserWithAuthDTO[]) => {
            if (!type) {
                return users;
            }
            return users.filter((user) => user.type === type);
        },
    });
}
