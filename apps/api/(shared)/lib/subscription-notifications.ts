import type {
    NotificationType,
    SubscriptionState,
    SubscriptionStatus,
} from "@repo/sdk/src/types";

const PAYMENT_PENDING: readonly string[] = [
    "past_due",
    "unpaid",
] satisfies SubscriptionStatus[];
const ACTIVE: readonly string[] = [
    "active",
    "trialing",
] satisfies SubscriptionStatus[];

type PreviousSubscription = { status: string; cancelAtPeriodEnd: boolean };

/** A snapshot of another subscription says nothing about this one, so it reads as absent. */
function readPrevious(
    stored: unknown,
    subscriptionId: string
): PreviousSubscription | null {
    if (!stored || typeof stored !== "object") {
        return null;
    }
    const raw = stored as Record<string, unknown>;
    if (raw.subscriptionId !== subscriptionId) {
        return null;
    }
    return {
        status: typeof raw.status === "string" ? raw.status : "",
        cancelAtPeriodEnd: raw.cancelAtPeriodEnd === true,
    };
}

/**
 * Which notice, if any, a subscription change gives its owner. The first activation gets
 * none, since checkout already confirms it, and neither does scheduling a cancellation:
 * the owner did it and the billing tab shows the end date. `stored` is the raw profile
 * value from before the change.
 */
export function subscriptionNotificationFor(
    stored: unknown,
    next: SubscriptionState
): NotificationType | null {
    const previous = readPrevious(stored, next.subscriptionId);

    if (PAYMENT_PENDING.includes(next.status)) {
        return previous && PAYMENT_PENDING.includes(previous.status)
            ? null
            : "subscriptionPaymentPending";
    }

    if (!previous) {
        return null;
    }

    if (next.status === "canceled") {
        return previous.status === "canceled" ? null : "subscriptionCanceled";
    }

    const recovered =
        PAYMENT_PENDING.includes(previous.status) ||
        (previous.cancelAtPeriodEnd && !next.cancelAtPeriodEnd);

    return ACTIVE.includes(next.status) && recovered
        ? "subscriptionReactivated"
        : null;
}
