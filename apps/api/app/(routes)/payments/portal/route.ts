import { resolveLocale } from "@repo/internationalization/utils";
import { getStripe } from "@repo/payments";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { logEvent } from "@repo/shared/utils/helpers/log";
import { requestIdFrom } from "@repo/shared/utils/helpers/request-id";
import { createPortalSession, isBillingEnabled } from "@/(shared)/lib/billing";
import { parseRequestJson } from "@/(shared)/lib/parse-request-json";
import { parseOpenPortal } from "@/(shared)/validation/payments.schema";
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

    const parsedBody = req.body
        ? await parseRequestJson(req)
        : ({ ok: true, value: {} } as const);
    if (!parsedBody.ok) {
        return parsedBody.response;
    }

    const parsed = parseOpenPortal(parsedBody.value);
    if (!parsed.ok) {
        return parsed.response;
    }

    const customerId = ctx.subjectProfile.stripeCustomerId;
    if (!customerId) {
        return refuse("PAYMENTS_CUSTOMER_NOT_FOUND", HTTP_STATUS.CONFLICT);
    }

    try {
        const url = await createPortalSession(
            stripe,
            customerId,
            resolveLocale(parsed.value.locale)
        );
        return Response.json({ data: { url } });
    } catch {
        logEvent("payments", "portal-failed", {
            requestId: requestIdFrom(req),
        });
        return refuse(
            "PAYMENTS_PROVIDER_UNAVAILABLE",
            HTTP_STATUS.SERVICE_UNAVAILABLE
        );
    }
});
