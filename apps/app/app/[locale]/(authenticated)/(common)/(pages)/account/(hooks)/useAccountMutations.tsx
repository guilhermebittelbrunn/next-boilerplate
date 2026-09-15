import useAlert from "@repo/design-system/hooks/useAlert";
import { getDictionary } from "@repo/internationalization/client";
import type {
    ChangePasswordRequest,
    UpdateAccountRequest,
} from "@repo/sdk/src/types";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/queryKeys";

export const useAccountMutations = () => {
    const { successAlert, errorAlert } = useAlert();
    const { dictionary, locale } = getDictionary();
    const queryClient = useQueryClient();
    const accountMessages = dictionary.apps.app.pages.common.account.messages;

    const formatClientError = (error: unknown) =>
        handleClientError(new FormattedError(error, locale));

    const updateProfileMutation = useMutation({
        mutationFn: (body: UpdateAccountRequest) =>
            apiClient.account.update(body),
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: queryKeys.account.me(),
            });
            successAlert(accountMessages.profileUpdated);
        },
        onError: (error) => errorAlert(formatClientError(error)),
    });

    const updatePreferencesMutation = useMutation({
        mutationFn: (body: UpdateAccountRequest) =>
            apiClient.account.update(body),
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: queryKeys.account.me(),
            });
            successAlert(accountMessages.preferencesUpdated);
        },
        onError: (error) => errorAlert(formatClientError(error)),
    });

    const changePasswordMutation = useMutation({
        mutationFn: (body: ChangePasswordRequest) =>
            apiClient.account.changePassword(body),
        onSuccess: () => successAlert(accountMessages.passwordChanged),
        onError: (error) => errorAlert(formatClientError(error)),
    });

    const revokeSessionsMutation = useMutation({
        mutationFn: () => apiClient.account.revokeSessions(),
        onSuccess: () => successAlert(accountMessages.sessionsRevoked),
        onError: (error) => errorAlert(formatClientError(error)),
    });

    return {
        updateProfileMutation,
        updatePreferencesMutation,
        changePasswordMutation,
        revokeSessionsMutation,
    };
};
