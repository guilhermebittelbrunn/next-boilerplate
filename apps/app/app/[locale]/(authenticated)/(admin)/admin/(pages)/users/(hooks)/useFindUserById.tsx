import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/client";

export const FIND_USER_BY_ID_QUERY_KEY = "find-user-by-id";

export function useFindUserById(id: string | undefined) {
    const { data, isLoading, isError } = useQuery({
        queryKey: [FIND_USER_BY_ID_QUERY_KEY, id],
        queryFn: () => id ? apiClient.user.findById(id) : undefined,
        enabled: Boolean(id),
    });

    return { data, isLoading, isError };
}
