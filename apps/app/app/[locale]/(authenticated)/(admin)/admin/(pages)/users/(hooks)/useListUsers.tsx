import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/client";


export const listUsers = async () => {
    const users = await apiClient.user.list();
    return users;
};


export const LIST_USERS_QUERY_KEY = "users";

export const useListUsers = () => {
    const { data, isLoading, error } = useQuery({
        queryKey: [LIST_USERS_QUERY_KEY],
        queryFn: listUsers,
    });

    return { data, isLoading, error };
};
