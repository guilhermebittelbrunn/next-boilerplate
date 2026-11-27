import { AuditAction, type SubscriptionState } from "@repo/sdk/src/types";
import {
    ACTIVE,
    PAYMENT_PENDING,
    readPrevious,
} from "./subscription-notifications";

/**
 * Which lifecycle facts a subscription change records in the audit trail. `stored` is the
 * raw profile value from before the change. A renewal that keeps price and status records
 * nothing, and coming back from a failed payment is not an activation.
 */
export function subscriptionAuditActionsFor(
    stored: unknown,
    next: SubscriptionState
): AuditAction[] {
    const previous = readPrevious(stored, next.subscriptionId);
    const actions: AuditAction[] = [];

    const isActive = ACTIVE.includes(next.status);
    const wasActive = previous !== null && ACTIVE.includes(previous.status);
    const wasPaymentPending =
        previous !== null && PAYMENT_PENDING.includes(previous.status);

    if (isActive && !wasActive && !wasPaymentPending) {
        actions.push(AuditAction.SUBSCRIPTION_ACTIVATE);
    }

    if (
        isActive &&
        wasActive &&
        previous.priceId !== null &&
        next.priceId !== null &&
        previous.priceId !== next.priceId
    ) {
        actions.push(AuditAction.SUBSCRIPTION_PLAN_CHANGE);
    }

    if (
        next.status !== "canceled" &&
        next.cancelAtPeriodEnd &&
        !previous?.cancelAtPeriodEnd
    ) {
        actions.push(AuditAction.SUBSCRIPTION_CANCELLATION_SCHEDULE);
    }

    if (
        next.status === "canceled" &&
        previous !== null &&
        previous.status !== "canceled"
    ) {
        actions.push(AuditAction.SUBSCRIPTION_END);
    }

    return actions;
}
