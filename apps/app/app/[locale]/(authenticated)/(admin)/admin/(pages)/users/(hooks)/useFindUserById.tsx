import type { UserWithAuthDTO } from "@repo/sdk/src/types";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/queryKeys";

export async function findUserById(
    id: string | undefined
): Promise<UserWithAuthDTO | undefined> {
    if (!id) {
        return;
    }
    return await apiClient.user.findById(id);
}

export function useFindUserById(id: string | undefined) {
    const { data, isLoading, isError } = useQuery({
        queryKey: queryKeys.users.detail(id ?? ""),
        queryFn: () => findUserById(id),
        enabled: Boolean(id),
    });

    return { data, isLoading, isError };
}
