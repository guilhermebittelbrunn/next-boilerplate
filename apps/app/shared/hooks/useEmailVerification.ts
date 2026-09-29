"use client";

import { logout, reloadCurrentUser } from "@repo/auth/client";
import useAlert from "@repo/design-system/hooks/useAlert";
import { getDictionary } from "@repo/internationalization/client";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/client";

export function useEmailVerification() {
    const { dictionary, locale } = getDictionary();
    const { successAlert, errorAlert } = useAlert();
    const emailVerificationMessages =
        dictionary.apps.app.pages.emailVerification.messages;

    const resendVerificationMutation = useMutation({
        mutationFn: () => apiClient.authApi.sendEmailVerification({ locale }),
        onSuccess: () => successAlert(emailVerificationMessages.resent),
        onError: (error) =>
            errorAlert(handleClientError(new FormattedError(error, locale))),
    });

    const confirmVerificationMutation = useMutation({
        mutationFn: async (oobCode: string) => {
            const confirmed = await apiClient.authApi.confirmEmailVerification({
                oobCode,
            });

            // The account in memory still claims the address is unverified, so it
            // is re-read to retire the pending notice. The action code is already
            // spent by now, so a failure here must not present a confirmation that
            // succeeded as an error — at worst the notice lingers until next sign-in.
            await reloadCurrentUser().catch(() => null);

            return confirmed;
        },
    });

    const confirmEmailChangeMutation = useMutation({
        mutationFn: async (oobCode: string) => {
            const confirmed = await apiClient.authApi.confirmEmailChange({
                oobCode,
            });

            // Opened in the browser of a session that was just revoked, the user in
            // memory still carries the old address and a dead refresh token. Signing it
            // out here does not navigate, so the success card stays on screen; the
            // change already happened, so a failure to sign out is not reported.
            await logout().catch(() => null);

            return confirmed;
        },
    });

    return {
        resendVerificationMutation,
        confirmVerificationMutation,
        confirmEmailChangeMutation,
    };
}
