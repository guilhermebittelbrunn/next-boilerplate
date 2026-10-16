import { isSubscriptionMode } from "@repo/next-config/product-mode";
import type { PlanDTO } from "@repo/sdk/src/types";
import { logEvent } from "@repo/shared/utils/helpers/log";
import { env } from "@/env";
import { apiClient } from "@/shared/lib/client";

type RequestFailure = { code?: unknown; response?: { status?: unknown } };

const statusOf = (error: unknown): number | null => {
    const status = (error as RequestFailure | null)?.response?.status;
    return typeof status === "number" ? status : null;
};

const reasonOf = (error: unknown): string | null => {
    const code = (error as RequestFailure | null)?.code;
    return typeof code === "string" ? code : null;
};

/**
 * Whatever goes wrong, the page renders: a catalog that cannot be read is shown as no
 * plans at all, never as prices the provider did not confirm.
 */
export async function loadPlanCatalog(): Promise<PlanDTO[]> {
    if (!(isSubscriptionMode() && env.NEXT_PUBLIC_API_URL)) {
        return [];
    }

    try {
        const catalog = await apiClient.payments.listCatalog();
        return catalog.enabled ? catalog.plans : [];
    } catch (error) {
        logEvent("payments", "catalog-unavailable", {
            status: statusOf(error),
            reason: reasonOf(error),
        });
        return [];
    }
}
