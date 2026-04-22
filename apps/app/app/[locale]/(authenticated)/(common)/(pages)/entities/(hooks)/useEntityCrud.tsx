/** biome-ignore-all lint/style/useFilenamingConvention: matches admin users colocated modules */
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
import {
    type EntityFormValues,
    entityGenreUnset,
} from "../(validations)/entityFormSchema";
import { FIND_ENTITY_BY_ID_QUERY_KEY } from "./useFindEntityById";
import { LIST_ENTITIES_QUERY_KEY } from "./useListEntities";

type UpdateEntityMutationInput = EntityFormValues & { id: string };

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
                queryKey: [LIST_ENTITIES_QUERY_KEY],
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
                queryKey: [LIST_ENTITIES_QUERY_KEY],
            });
            await queryClient.invalidateQueries({
                queryKey: [FIND_ENTITY_BY_ID_QUERY_KEY, variables.id],
            });
            successAlert(messages.updated);
        },
        onError: (error) => errorAlert(formatClientError(error)),
    });

    const toggleEntityStatusMutation = useMutation({
        mutationFn: (input: { id: string; enabled: boolean }) =>
            apiClient.entity.update(input.id, { enabled: input.enabled }),
        onSuccess: (_data, variables) => {
            queryClient.setQueryData(
                [LIST_ENTITIES_QUERY_KEY],
                (old: EntityDTO[] | undefined) =>
                    old?.map((row) =>
                        row.id === variables.id
                            ? { ...row, enabled: variables.enabled }
                            : row
                    )
            );
            queryClient.setQueryData(
                [FIND_ENTITY_BY_ID_QUERY_KEY, variables.id],
                (old: EntityDTO | undefined) =>
                    old
                        ? { ...old, enabled: variables.enabled }
                        : old
            );
        },
        onError: (error) => errorAlert(formatClientError(error)),
    });

    const deleteEntityMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiClient.entity.delete(id);
            return id;
        },
        onSuccess: async (id: string) => {
            await queryClient.invalidateQueries({
                queryKey: [LIST_ENTITIES_QUERY_KEY],
            });
            await queryClient.invalidateQueries({
                queryKey: [FIND_ENTITY_BY_ID_QUERY_KEY, id],
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
