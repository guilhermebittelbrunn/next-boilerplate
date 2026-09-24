import useAlert from "@repo/design-system/hooks/useAlert";
import { getDictionary } from "@repo/internationalization/client";
import type {
    AdvanceOnboardingRequest,
    UpdateAccountRequest,
} from "@repo/sdk/src/types";
import FormattedError from "@repo/shared/utils/helpers/formattedError";
import { handleClientError } from "@repo/shared/utils/helpers/handleClientError";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { apiClient } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/queryKeys";

export type AdvanceOnboardingVariables = AdvanceOnboardingRequest & {
    account?: UpdateAccountRequest;
};

type UseOnboardingMutationsOptions = {
    onConflict: () => void;
};

export const useOnboardingMutations = ({
    onConflict,
}: UseOnboardingMutationsOptions) => {
    const { errorAlert } = useAlert();
    const { locale } = getDictionary();
    const router = useRouter();
    const queryClient = useQueryClient();

    const advanceOnboardingMutation = useMutation({
        // The account is written first: if the step then fails to advance, the data is
        // already saved and the same step comes back filled in on the next visit.
        mutationFn: async ({
            account,
            ...request
        }: AdvanceOnboardingVariables) => {
            if (account) {
                await apiClient.account.update(account);
            }
            return apiClient.account.advanceOnboarding(request);
        },
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: queryKeys.account.me() }),
        onError: (error) => {
            const formattedError = new FormattedError(error, locale);
            errorAlert(handleClientError(formattedError));
            if (formattedError.status === HTTP_STATUS.CONFLICT) {
                onConflict();
                router.refresh();
            }
        },
    });

    return { advanceOnboardingMutation };
};
