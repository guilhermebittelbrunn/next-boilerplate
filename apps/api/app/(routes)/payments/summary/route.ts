import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { isBillingEnabled } from "@/(shared)/lib/billing";
import { buildBillingSummary } from "@/(shared)/lib/billing-summary";
import { isMissingIndexError } from "@/(shared)/lib/pagination";
import { requireAdminApi } from "@/app/(guards)/admin";

/**
 * Reads only what the payments webhook stored, never the provider: Stripe being down does
 * not reach the admin home. Switched off answers `enabled: false`, the same rule that hides
 * the billing tab from the common panel.
 */
export const GET = requireAdminApi(async () => {
    if (!isBillingEnabled()) {
        return Response.json({ data: { enabled: false } });
    }

    try {
        const summary = await buildBillingSummary(new Date());

        return Response.json({ data: { enabled: true, ...summary } });
    } catch (error) {
        if (isMissingIndexError(error)) {
            return Response.json(
                { error: { code: "SUMMARY_INDEX_MISSING" } },
                { status: HTTP_STATUS.SERVICE_UNAVAILABLE }
            );
        }
        throw error;
    }
});
