import useAlert from "@repo/design-system/hooks/useAlert";
import { getDictionary } from "@repo/internationalization/client";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/queryKeys";

export const useAccountSessionMutations = () => {
    const { successAlert, errorAlert } = useAlert();
    const { dictionary, locale } = getDictionary();
    const queryClient = useQueryClient();
    const accountMessages = dictionary.apps.app.pages.common.account.messages;

    const formatClientError = (error: unknown) =>
        handleClientError(new FormattedError(error, locale));

    const refreshSessions = () =>
        queryClient.invalidateQueries({
            queryKey: queryKeys.account.sessions(),
        });

    const revokeSessionMutation = useMutation({
        mutationFn: (id: string) => apiClient.account.revokeSession(id),
        onSuccess: async () => {
            await refreshSessions();
            successAlert(accountMessages.sessionRevoked);
        },
        onError: (error) => errorAlert(formatClientError(error)),
    });

    const revokeOtherSessionsMutation = useMutation({
        mutationFn: () => apiClient.account.revokeOtherSessions(),
        onSuccess: async () => {
            await refreshSessions();
            successAlert(accountMessages.otherSessionsRevoked);
        },
        onError: (error) => errorAlert(formatClientError(error)),
    });

    return { revokeSessionMutation, revokeOtherSessionsMutation };
};
