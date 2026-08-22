import useAlert from "@repo/design-system/hooks/useAlert";
import { getDictionary } from "@repo/internationalization/client";
import type {
    CreateEntityRequest,
    EntityDTO,
    UpdateEntityRequest,
} from "@repo/sdk/src/types";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/queryKeys";
import {
    type EntityFormValues,
    entityGenreUnset,
} from "../(validations)/entityFormSchema";

type UpdateEntityMutationInput = EntityFormValues & { id: string };

type ToggleEntityStatusInput = { id: string; enabled: boolean };

type ToggleEntityStatusContext = {
    previousList?: EntityDTO[];
    previousDetail?: EntityDTO;
};

export const useEntityCrud = () => {
    const { successAlert, errorAlert } = useAlert();
    const { dictionary, locale } = getDictionary();
    const queryClient = useQueryClient();
    const messages = dictionary.apps.app.pages.common.entities.messages;

    const formatClientError = (error: unknown) =>
        handleClientError(new FormattedError(error, locale));

    const createEntityMutation = useMutation({
        mutationFn: (values: EntityFormValues) => {
            const body: CreateEntityRequest = {
                name: values.name,
                description: values.description,
                type: values.type,
                photo: values.photo.trim() === "" ? null : values.photo.trim(),
                genre: values.genre === entityGenreUnset ? null : values.genre,
                birthdate:
                    values.birthdate.trim() === ""
                        ? null
                        : values.birthdate.trim(),
                enabled: values.enabled,
            };
            return apiClient.entity.create(body);
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: queryKeys.entities.list(),
            });
            successAlert(messages.created);
        },
        onError: (error) => errorAlert(formatClientError(error)),
    });

    const updateEntityMutation = useMutation({
        mutationFn: (input: UpdateEntityMutationInput) => {
            const body: UpdateEntityRequest = {
                name: input.name,
                description: input.description,
                type: input.type,
                photo: input.photo.trim() === "" ? null : input.photo.trim(),
                genre: input.genre === entityGenreUnset ? null : input.genre,
                birthdate:
                    input.birthdate.trim() === ""
                        ? null
                        : input.birthdate.trim(),
                enabled: input.enabled,
            };
            return apiClient.entity.update(input.id, body);
        },
        onSuccess: async (_data, variables) => {
            await queryClient.invalidateQueries({
                queryKey: queryKeys.entities.list(),
            });
            await queryClient.invalidateQueries({
                queryKey: queryKeys.entities.detail(variables.id),
            });
            successAlert(messages.updated);
        },
        onError: (error) => errorAlert(formatClientError(error)),
    });

    // Optimistic toggle: flip the UI immediately, roll back on error.
    // No invalidateQueries (per repo rule for `enabled` toggles).
    const toggleEntityStatusMutation = useMutation({
        mutationFn: (input: ToggleEntityStatusInput) =>
            apiClient.entity.update(input.id, { enabled: input.enabled }),
        onMutate: async (
            input: ToggleEntityStatusInput
        ): Promise<ToggleEntityStatusContext> => {
            await queryClient.cancelQueries({
                queryKey: queryKeys.entities.list(),
            });
            await queryClient.cancelQueries({
                queryKey: queryKeys.entities.detail(input.id),
            });

            const previousList = queryClient.getQueryData<EntityDTO[]>(
                queryKeys.entities.list()
            );
            const previousDetail = queryClient.getQueryData<EntityDTO>(
                queryKeys.entities.detail(input.id)
            );

            queryClient.setQueryData<EntityDTO[]>(
                queryKeys.entities.list(),
                (old) =>
                    old?.map((row) =>
                        row.id === input.id
                            ? { ...row, enabled: input.enabled }
                            : row
                    )
            );
            queryClient.setQueryData<EntityDTO>(
                queryKeys.entities.detail(input.id),
                (old) => (old ? { ...old, enabled: input.enabled } : old)
            );

            return { previousList, previousDetail };
        },
        onError: (error, input, context) => {
            if (context?.previousList) {
                queryClient.setQueryData(
                    queryKeys.entities.list(),
                    context.previousList
                );
            }
            if (context?.previousDetail) {
                queryClient.setQueryData(
                    queryKeys.entities.detail(input.id),
                    context.previousDetail
                );
            }
            errorAlert(formatClientError(error));
        },
    });

    const deleteEntityMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiClient.entity.delete(id);
            return id;
        },
        onSuccess: async (id: string) => {
            await queryClient.invalidateQueries({
                queryKey: queryKeys.entities.list(),
            });
            await queryClient.invalidateQueries({
                queryKey: queryKeys.entities.detail(id),
            });
            successAlert(messages.deleted);
        },
        onError: (error) => errorAlert(formatClientError(error)),
    });

    return {
        createEntityMutation,
        updateEntityMutation,
        toggleEntityStatusMutation,
        deleteEntityMutation,
    };
};
