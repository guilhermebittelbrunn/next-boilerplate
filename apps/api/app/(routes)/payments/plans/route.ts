import { getStripe } from "@repo/payments";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { logEvent } from "@repo/shared/utils/helpers/log";
import { requestIdFrom } from "@repo/shared/utils/helpers/request-id";
import { isBillingEnabled, listPlans } from "@/(shared)/lib/billing";
import { requireCommonPanelApi } from "@/app/(guards)/common-panel";

/**
 * Switched off is a description of the environment, not a failure: the panel shows what
 * it showed before billing existed, without retrying a request that cannot succeed.
 */
export const GET = requireCommonPanelApi(async (req) => {
    const stripe = getStripe();

    if (!(stripe && isBillingEnabled())) {
        return Response.json({ data: { enabled: false, plans: [] } });
    }

    try {
        const plans = await listPlans(stripe);
        return Response.json({ data: { enabled: true, plans } });
    } catch {
        logEvent("payments", "plans-failed", { requestId: requestIdFrom(req) });
        return Response.json(
            { error: { code: "PAYMENTS_PROVIDER_UNAVAILABLE" } },
            { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
        );
    }
});
