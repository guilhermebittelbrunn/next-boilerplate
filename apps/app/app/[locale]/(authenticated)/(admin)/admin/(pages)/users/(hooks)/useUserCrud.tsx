import useAlert from "@repo/design-system/hooks/useAlert";
import { getDictionary } from "@repo/internationalization/client";
import type { AdminUpdateUserRequest } from "@repo/sdk/src/types";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/client";
import type {
    CreateUserFormValues,
    UpdateUserFormValues,
} from "../(validations)/userFormSchema";
import { FIND_USER_BY_ID_QUERY_KEY } from "./useFindUserById";
import { LIST_USERS_QUERY_KEY } from "./useListUsers";

type UpdateUserMutationInput = UpdateUserFormValues & { id: string };

export const useUserCrud = () => {
    const { successAlert, errorAlert } = useAlert();
    const { dictionary, locale } = getDictionary();
    const queryClient = useQueryClient();
    const messages = dictionary.apps.app.pages.admin.users.messages;

    const formatClientError = (error: unknown) =>
        handleClientError(new FormattedError(error, locale));

    const createUserMutation = useMutation({
        mutationFn: (values: CreateUserFormValues) =>
            apiClient.user.create({
                email: values.email,
                password: values.password,
                type: values.type,
                displayName: values.displayName?.trim() || undefined,
            }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: [LIST_USERS_QUERY_KEY],
            });
            successAlert(messages.created);
        },
        onError: (error) => errorAlert(formatClientError(error)),
    });

    const updateUserMutation = useMutation({
        mutationFn: (input: UpdateUserMutationInput) => {
            const body: AdminUpdateUserRequest = {
                id: input.id,
                type: input.type,
                displayName:
                    input.displayName === ""
                        ? null
                        : (input.displayName ?? null),
            };
            return apiClient.user.update(body);
        },
        onSuccess: async (_data, variables) => {
            await queryClient.invalidateQueries({
                queryKey: [LIST_USERS_QUERY_KEY],
            });
            await queryClient.invalidateQueries({
                queryKey: [FIND_USER_BY_ID_QUERY_KEY, variables.id],
            });
            successAlert(messages.updated);
        },
        onError: (error) => errorAlert(formatClientError(error)),
    });

    const deleteUserMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiClient.user.delete(id);
            return id;
        },
        onSuccess: async (id: string) => {
            await queryClient.invalidateQueries({
                queryKey: [LIST_USERS_QUERY_KEY],
            });
            await queryClient.invalidateQueries({
                queryKey: [FIND_USER_BY_ID_QUERY_KEY, id],
            });
            successAlert(messages.deleted);
        },
        onError: (error) => errorAlert(formatClientError(error)),
    });

    return { createUserMutation, updateUserMutation, deleteUserMutation };
};
