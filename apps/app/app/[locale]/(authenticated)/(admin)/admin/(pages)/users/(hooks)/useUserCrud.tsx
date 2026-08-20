import useAlert from "@repo/design-system/hooks/useAlert";
import { getDictionary } from "@repo/internationalization/client";
import type {
    AdminUpdateUserRequest,
    UserWithAuthDTO,
} from "@repo/sdk/src/types";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/queryKeys";
import type {
    CreateUserFormValues,
    UpdateUserFormValues,
} from "../(validations)/userFormSchema";

type UpdateUserMutationInput = UpdateUserFormValues & { id: string };

type ToggleUserStatusInput = { id: string; disabled: boolean };

type ToggleUserStatusContext = {
    previousList?: UserWithAuthDTO[];
    previousDetail?: UserWithAuthDTO;
};

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
            // Prefix invalidation: the listing is cached per scope (all / common),
            // and a new user can belong to either.
            await queryClient.invalidateQueries({
                queryKey: queryKeys.users.all,
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
        onSuccess: async () => {
            // Covers every list scope plus the detail entries — a `type` change moves
            // the user between scopes.
            await queryClient.invalidateQueries({
                queryKey: queryKeys.users.all,
            });
            successAlert(messages.updated);
        },
        onError: (error) => errorAlert(formatClientError(error)),
    });

    // Optimistic status toggle (active = !disabled). No invalidateQueries.
    const toggleUserStatusMutation = useMutation({
        mutationFn: (input: ToggleUserStatusInput) =>
            apiClient.user.update({ id: input.id, disabled: input.disabled }),
        onMutate: async (
            input: ToggleUserStatusInput
        ): Promise<ToggleUserStatusContext> => {
            await queryClient.cancelQueries({
                queryKey: queryKeys.users.list(),
            });
            await queryClient.cancelQueries({
                queryKey: queryKeys.users.detail(input.id),
            });

            const previousList = queryClient.getQueryData<UserWithAuthDTO[]>(
                queryKeys.users.list()
            );
            const previousDetail = queryClient.getQueryData<UserWithAuthDTO>(
                queryKeys.users.detail(input.id)
            );

            queryClient.setQueryData<UserWithAuthDTO[]>(
                queryKeys.users.list(),
                (old) =>
                    old?.map((row) =>
                        row.id === input.id
                            ? { ...row, disabled: input.disabled }
                            : row
                    )
            );
            queryClient.setQueryData<UserWithAuthDTO>(
                queryKeys.users.detail(input.id),
                (old) => (old ? { ...old, disabled: input.disabled } : old)
            );

            return { previousList, previousDetail };
        },
        onError: (error, input, context) => {
            if (context?.previousList) {
                queryClient.setQueryData(
                    queryKeys.users.list(),
                    context.previousList
                );
            }
            if (context?.previousDetail) {
                queryClient.setQueryData(
                    queryKeys.users.detail(input.id),
                    context.previousDetail
                );
            }
            errorAlert(formatClientError(error));
        },
    });

    const deleteUserMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiClient.user.delete(id);
            return id;
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: queryKeys.users.all,
            });
            successAlert(messages.deleted);
        },
        onError: (error) => errorAlert(formatClientError(error)),
    });

    return {
        createUserMutation,
        updateUserMutation,
        toggleUserStatusMutation,
        deleteUserMutation,
    };
};
