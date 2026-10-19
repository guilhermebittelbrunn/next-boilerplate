import { linkGoogle, reauthenticateWithGoogle } from "@repo/auth/client";
import useAlert from "@repo/design-system/hooks/useAlert";
import { getDictionary } from "@repo/internationalization/client";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/queryKeys";
import {
    GOOGLE_PROVIDER_ID,
    isPopupDismissed,
    PASSWORD_PROVIDER_ID,
} from "@/shared/lib/signInMethods";

export const useSignInMethodMutations = () => {
    const { successAlert, errorAlert } = useAlert();
    const { dictionary, locale } = getDictionary();
    const queryClient = useQueryClient();
    const accountMessages = dictionary.apps.app.pages.common.account.messages;

    const alertUnlessDismissed = (error: unknown) => {
        if (isPopupDismissed(error)) {
            return;
        }
        errorAlert(handleClientError(new FormattedError(error, locale)));
    };

    const refreshAccount = () =>
        queryClient.invalidateQueries({ queryKey: queryKeys.account.me() });

    // Every session ends on success, so the caller signs out instead of refetching.
    const setPasswordMutation = useMutation({
        mutationFn: async (password: string) => {
            const reauthIdToken = await reauthenticateWithGoogle();
            return apiClient.account.setPassword({ reauthIdToken, password });
        },
        onSuccess: () => successAlert(accountMessages.passwordSet),
        onError: alertUnlessDismissed,
    });

    // The link may already exist when recording it fails, so the list is refreshed either way.
    const linkGoogleMutation = useMutation({
        mutationFn: async () => {
            await linkGoogle();
            return apiClient.account.confirmSignInMethodLinked({
                providerId: GOOGLE_PROVIDER_ID,
            });
        },
        onSuccess: async () => {
            await refreshAccount();
            successAlert(accountMessages.signInMethodLinked);
        },
        onError: async (error) => {
            await refreshAccount();
            alertUnlessDismissed(error);
        },
    });

    // Unlinking the password ends every session, so the caller signs out instead.
    const unlinkMutation = useMutation({
        mutationFn: (providerId: string) =>
            apiClient.account.unlinkSignInMethod(providerId),
        onSuccess: async (_data, providerId) => {
            if (providerId === PASSWORD_PROVIDER_ID) {
                successAlert(accountMessages.passwordUnlinked);
                return;
            }
            await refreshAccount();
            successAlert(accountMessages.signInMethodUnlinked);
        },
        onError: async (error) => {
            await refreshAccount();
            alertUnlessDismissed(error);
        },
    });

    return { setPasswordMutation, linkGoogleMutation, unlinkMutation };
};
