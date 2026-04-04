import type { UserDTO } from "@repo/auth/types";
import useAlert from "@repo/design-system/hooks/useAlert";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/client";
import { useQuery } from "@/shared/providers/query-provider";
import { LIST_USERS_QUERY_KEY } from "./useListUsers";

export const useUserCrud = () => {
    const { successAlert, errorAlert } = useAlert();
    const { removeDataFromCache } = useQuery();

    const createUserMutation = useMutation({
        mutationFn: (user: UserDTO) => apiClient.user.create(user),
        onSuccess: () => successAlert("Usuário criado com sucesso"),
        onError: (error) => errorAlert(error.message),
    });

    const updateUserMutation = useMutation({
        mutationFn: (user: UserDTO) => apiClient.user.update(user),
        onSuccess: () => successAlert("Usuário atualizado com sucesso"),
        onError: (error) => errorAlert(error.message),
    });

    const deleteUserMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiClient.user.delete(id);
            return id;
        },
        onSuccess: (id: string) => {
            removeDataFromCache(id, LIST_USERS_QUERY_KEY);
            successAlert("Usuário deletado com sucesso");
        },
        onError: (error) => errorAlert(error.message),
    });

    return { createUserMutation, updateUserMutation, deleteUserMutation };
};
