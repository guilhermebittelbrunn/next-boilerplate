import { getStripe } from "@repo/payments";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { logEvent } from "@repo/shared/utils/helpers/log";
import { requestIdFrom } from "@repo/shared/utils/helpers/request-id";
import { isBillingEnabled } from "@/(shared)/lib/billing";
import { listPlansCached } from "@/(shared)/lib/plan-catalog-cache";

// Never pre-rendered at build time: the answer depends on the provider and on the
// fork's configuration at the moment it is asked.
export const dynamic = "force-dynamic";

/** Unguarded: the landing renders it for visitors who do not have an account yet. */
export async function GET(req: Request) {
    const stripe = getStripe();

    if (!(stripe && isBillingEnabled())) {
        return Response.json({ data: { enabled: false, plans: [] } });
    }

    try {
        const plans = await listPlansCached(stripe);
        return Response.json({ data: { enabled: true, plans } });
    } catch {
        logEvent("payments", "catalog-failed", {
            requestId: requestIdFrom(req),
        });
        return Response.json(
            { error: { code: "PAYMENTS_PROVIDER_UNAVAILABLE" } },
            { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
        );
    }
}
