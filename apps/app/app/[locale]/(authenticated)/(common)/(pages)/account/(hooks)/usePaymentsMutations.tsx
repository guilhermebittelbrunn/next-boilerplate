import useAlert from "@repo/design-system/hooks/useAlert";
import { getDictionary } from "@repo/internationalization/client";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/client";

/** Both actions end on a Stripe-hosted page, so success is a full navigation, not a toast. */
export const usePaymentsMutations = () => {
    const { errorAlert } = useAlert();
    const { locale } = getDictionary();

    const formatClientError = (error: unknown) =>
        handleClientError(new FormattedError(error, locale));

    const checkoutMutation = useMutation({
        mutationFn: (input: { priceId: string }) =>
            apiClient.payments.createCheckout({
                priceId: input.priceId,
                locale,
            }),
        onSuccess: ({ url }) => window.location.assign(url),
        onError: (error) => errorAlert(formatClientError(error)),
    });

    const portalMutation = useMutation({
        mutationFn: () => apiClient.payments.openPortal({ locale }),
        onSuccess: ({ url }) => window.location.assign(url),
        onError: (error) => errorAlert(formatClientError(error)),
    });

    return { checkoutMutation, portalMutation };
};
