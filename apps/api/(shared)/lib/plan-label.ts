import type { Stripe } from "@repo/payments";
import { logEvent } from "@repo/shared/utils/helpers/log";
import { planLabelRepository } from "../repositories/plan-label.repository";
import { toPlanLabel } from "./billing-state";

const MS_PER_DAY = 86_400_000;

export const PLAN_LABEL_TTL_DAYS = 7;
/** Stripe waits a few seconds for a webhook answer; a display name must not hold it past that. */
export const PLAN_LABEL_TIMEOUT_MS = 3000;

/** Stripe errors carry their class in `type`; everything else falls back to `name`. */
function errorKind(error: unknown): string {
    const { type, name } = (error ?? {}) as { type?: unknown; name?: unknown };
    if (typeof type === "string") {
        return type;
    }
    return typeof name === "string" ? name : "unknown";
}

/**
 * Keeps a local copy of the price's display name so the admin home never calls Stripe.
 * A name is cosmetic: any failure is logged and swallowed, and a stale copy stays in place,
 * because failing the webhook over it would delay recording the payment itself.
 */
export async function ensurePlanLabel(
    stripe: Stripe,
    priceId: string,
    requestId: string | null,
    now: Date = new Date()
): Promise<void> {
    try {
        const cached = await planLabelRepository.find(priceId);
        if (
            cached &&
            now.getTime() - Date.parse(cached.resolvedAt) <
                PLAN_LABEL_TTL_DAYS * MS_PER_DAY
        ) {
            return;
        }

        const price = await stripe.prices.retrieve(
            priceId,
            { expand: ["product"] },
            { timeout: PLAN_LABEL_TIMEOUT_MS, maxNetworkRetries: 0 }
        );
        await planLabelRepository.save(priceId, toPlanLabel(price));
    } catch (error) {
        logEvent("payments", "plan-label-unresolved", {
            requestId,
            reason: errorKind(error),
        });
    }
}
