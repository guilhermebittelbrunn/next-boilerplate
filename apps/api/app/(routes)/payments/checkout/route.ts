import { resolveLocale } from "@repo/internationalization/utils";
import { getStripe } from "@repo/payments";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { logEvent } from "@repo/shared/utils/helpers/log";
import { requestIdFrom } from "@repo/shared/utils/helpers/request-id";
import {
    createCheckoutSession,
    ensureStripeCustomer,
    findRecurringPrice,
    isBillingEnabled,
} from "@/(shared)/lib/billing";
import { isLiveSubscription } from "@/(shared)/lib/billing-state";
import { parseRequestJson } from "@/(shared)/lib/parse-request-json";
import { parseCreateCheckout } from "@/(shared)/validation/payments.schema";
import { requireCommonPanelApi } from "@/app/(guards)/common-panel";

const refuse = (code: string, status: number): Response =>
    Response.json({ error: { code } }, { status });

export const POST = requireCommonPanelApi(async (req, ctx) => {
    const stripe = getStripe();
    if (!(stripe && isBillingEnabled())) {
        return refuse(
            "PAYMENTS_NOT_CONFIGURED",
            HTTP_STATUS.SERVICE_UNAVAILABLE
        );
    }

    const parsedBody = await parseRequestJson(req);
    if (!parsedBody.ok) {
        return parsedBody.response;
    }

    const parsed = parseCreateCheckout(parsedBody.value);
    if (!parsed.ok) {
        return parsed.response;
    }

    // A second checkout while one subscription is live would bill the customer twice;
    // changing plans goes through the portal.
    if (isLiveSubscription(ctx.subjectProfile.subscription)) {
        return refuse(
            "PAYMENTS_SUBSCRIPTION_ALREADY_ACTIVE",
            HTTP_STATUS.CONFLICT
        );
    }

    const locale = resolveLocale(parsed.value.locale);

    try {
        const price = await findRecurringPrice(stripe, parsed.value.priceId);
        if (!price) {
            return refuse("PAYMENTS_PLAN_NOT_FOUND", HTTP_STATUS.NOT_FOUND);
        }

        const customerId = await ensureStripeCustomer(
            stripe,
            ctx.subjectProfile,
            ctx.user.email ?? null
        );
        const url = await createCheckoutSession(stripe, {
            customerId,
            priceId: price.id,
            profileId: ctx.subjectProfile.id,
            locale,
        });

        return Response.json({ data: { url } });
    } catch {
        logEvent("payments", "checkout-failed", {
            requestId: requestIdFrom(req),
        });
        return refuse(
            "PAYMENTS_PROVIDER_UNAVAILABLE",
            HTTP_STATUS.SERVICE_UNAVAILABLE
        );
    }
});
