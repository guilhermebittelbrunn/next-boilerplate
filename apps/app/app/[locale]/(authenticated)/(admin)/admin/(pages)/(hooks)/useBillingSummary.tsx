import { isSubscriptionMode } from "@repo/next-config/product-mode";
import type { BillingSummaryDTO } from "@repo/sdk/src/types";
import { useAuthorizedQuery } from "@/shared/hooks/useAuthorizedQuery";
import { apiClient } from "@/shared/lib/client";
import { queryKeys } from "@/shared/lib/queryKeys";

export function fetchBillingSummary(): Promise<BillingSummaryDTO> {
    return apiClient.payments.summary();
}

export const useBillingSummary = () => {
    const query = useAuthorizedQuery({
        queryKey: queryKeys.payments.summary(),
        queryFn: fetchBillingSummary,
        enabled: isSubscriptionMode(),
    });

    return {
        data: query.data,
        isLoading: query.isLoading,
        error: query.error,
        refetch: query.refetch,
    };
};
