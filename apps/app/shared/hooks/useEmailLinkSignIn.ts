"use client";

import useAlert from "@repo/design-system/hooks/useAlert";
import { getDictionary } from "@repo/internationalization/client";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/client";
import { rememberEmailForLink } from "@/shared/lib/emailLinkSignIn";
import { queryKeys } from "@/shared/lib/queryKeys";

const AVAILABILITY_STALE_TIME_MS = 300_000;

export const fetchEmailLinkAvailability = () =>
    apiClient.authApi.emailLinkSignInAvailability();

export function useEmailLinkAvailability() {
    return useQuery({
        queryKey: queryKeys.auth.emailLinkAvailability(),
        queryFn: fetchEmailLinkAvailability,
        staleTime: AVAILABILITY_STALE_TIME_MS,
        retry: false,
    });
}

export function useEmailLinkRequest() {
    const { locale } = getDictionary();
    const { errorAlert } = useAlert();

    return useMutation({
        mutationFn: (email: string) =>
            apiClient.authApi.requestEmailLinkSignIn({ email, locale }),
        onSuccess: (_requested, email) => rememberEmailForLink(email),
        onError: (error) =>
            errorAlert(handleClientError(new FormattedError(error, locale))),
    });
}
