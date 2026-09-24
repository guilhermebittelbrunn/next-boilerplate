import type { PaymentPlansDTO } from "@repo/sdk/src/types";
import { useAuthorizedQuery } from "@/shared/hooks/useAuthorizedQuery";
import { apiClient } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/queryKeys";

export function fetchPlans(): Promise<PaymentPlansDTO> {
    return apiClient.payments.listPlans();
}

export function useListPlans() {
    const { data, isLoading, isError } = useAuthorizedQuery({
        queryKey: queryKeys.payments.plans(),
        queryFn: fetchPlans,
    });

    return { data, isLoading, isError };
}
