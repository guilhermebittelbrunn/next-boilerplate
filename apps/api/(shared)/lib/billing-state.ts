import type { Stripe } from "@repo/payments";
import {
    LIVE_SUBSCRIPTION_STATUSES,
    type PlanDTO,
    type PlanInterval,
    type SubscriptionState,
    type SubscriptionStatus,
} from "@repo/sdk/src/types";
import { normalizeFirestoreInstant } from "@repo/shared/utils/helpers/normalizeFirestoreInstant";

const MS_PER_SECOND = 1000;

/** Stripe never moves a subscription out of these, so no later event can revive one. */
const TERMINAL_STATUSES: readonly string[] = ["canceled", "incomplete_expired"];

export function isLiveSubscription(
    state: { status?: unknown } | null | undefined
): boolean {
    return LIVE_SUBSCRIPTION_STATUSES.includes(
        state?.status as SubscriptionStatus
    );
}

const idOf = (
    value: string | { id: string } | null | undefined
): string | null => {
    if (!value) {
        return null;
    }
    return typeof value === "string" ? value : value.id;
};

/**
 * The period end is read from the first item: from API version 2025-03-31 on it lives on
 * the subscription item, and a subscription created by checkout carries a single item.
 */
export function toSubscriptionState(
    subscription: Stripe.Subscription,
    eventCreatedSeconds: number
): SubscriptionState {
    const item = subscription.items?.data?.[0];
    const price = item?.price;

    return {
        subscriptionId: subscription.id,
        status: subscription.status,
        priceId: price?.id ?? null,
        productId: idOf(price?.product),
        unitAmount: price?.unit_amount ?? null,
        currency: price?.currency ?? null,
        interval: price?.recurring?.interval ?? null,
        intervalCount: price?.recurring?.interval_count ?? null,
        currentPeriodEnd: item?.current_period_end
            ? new Date(item.current_period_end * MS_PER_SECOND)
            : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
        lastEventAt: new Date(eventCreatedSeconds * MS_PER_SECOND),
    };
}

/** `null` for a one-off price or for a product that is archived or deleted. */
export function toPlanDTO(price: Stripe.Price): PlanDTO | null {
    const product = price.product;

    if (
        !(price.active && price.recurring) ||
        typeof product === "string" ||
        product.deleted ||
        !product.active
    ) {
        return null;
    }

    return {
        priceId: price.id,
        productId: product.id,
        name: product.name,
        description: product.description ?? null,
        features: (product.marketing_features ?? [])
            .map((feature) => feature.name)
            .filter((name): name is string => Boolean(name)),
        unitAmount: price.unit_amount ?? null,
        currency: price.currency,
        interval: price.recurring.interval,
        intervalCount: price.recurring.interval_count,
    };
}

export type PaidInvoiceRecord = {
    invoiceId: string;
    /** Links a first payment to its subscriber; the invoice ledger never stores it. */
    customerId: string | null;
    subscriptionId: string | null;
    priceId: string | null;
    billingReason: string | null;
    /** In the smallest unit of `currency`. */
    amountPaid: number;
    currency: string;
    paidAt: Date;
};

/**
 * From API version 2025-03-31 on the subscription lives under `parent`; the first line
 * still carries it on older endpoint versions, so it is the fallback.
 */
export function toPaidInvoiceRecord(
    invoice: Stripe.Invoice,
    eventCreatedSeconds: number
): PaidInvoiceRecord {
    const firstLine = invoice.lines?.data?.[0];
    const paidAtSeconds =
        invoice.status_transitions?.paid_at ?? eventCreatedSeconds;

    return {
        invoiceId: invoice.id,
        customerId: idOf(invoice.customer),
        subscriptionId:
            idOf(invoice.parent?.subscription_details?.subscription) ??
            idOf(firstLine?.subscription),
        priceId: firstLine?.pricing?.price_details?.price ?? null,
        billingReason: invoice.billing_reason ?? null,
        amountPaid: invoice.amount_paid ?? 0,
        currency: invoice.currency,
        paidAt: new Date(paidAtSeconds * MS_PER_SECOND),
    };
}

export type PlanLabel = {
    name: string | null;
    productId: string | null;
    interval: PlanInterval | null;
    intervalCount: number | null;
};

/**
 * Unlike `toPlanDTO`, an archived product keeps its name: people still subscribed to a
 * plan that is no longer sold must see what they are paying for.
 */
export function toPlanLabel(price: Stripe.Price): PlanLabel {
    const product = price.product;
    const productName =
        typeof product === "object" && product !== null && !product.deleted
            ? product.name
            : null;

    return {
        name: productName || price.nickname || null,
        productId: idOf(product),
        interval: price.recurring?.interval ?? null,
        intervalCount: price.recurring?.interval_count ?? null,
    };
}

export type SubscriptionWriteDecision =
    | { kind: "apply" }
    | {
          kind: "skip";
          reason:
              | "stale"
              | "terminal"
              | "created-after-known"
              | "older-subscription-ended";
      };

type StoredSubscription = {
    subscriptionId: string;
    status: string;
    lastEventAtMs: number;
};

function readStored(stored: unknown): StoredSubscription | null {
    if (!stored || typeof stored !== "object") {
        return null;
    }
    const raw = stored as Record<string, unknown>;
    if (typeof raw.subscriptionId !== "string") {
        return null;
    }
    return {
        subscriptionId: raw.subscriptionId,
        status: typeof raw.status === "string" ? raw.status : "",
        lastEventAtMs: Date.parse(normalizeFirestoreInstant(raw.lastEventAt)),
    };
}

const APPLY: SubscriptionWriteDecision = { kind: "apply" };

const skip = (
    reason: Extract<SubscriptionWriteDecision, { kind: "skip" }>["reason"]
): SubscriptionWriteDecision => ({ kind: "skip", reason });

/**
 * Stripe delivers events out of order and more than once, so the stored snapshot only
 * moves forward. `stored` is the raw document value, with Firestore timestamps.
 */
export function decideSubscriptionWrite(
    stored: unknown,
    next: SubscriptionState,
    eventType: string
): SubscriptionWriteDecision {
    const current = readStored(stored);

    if (!current) {
        return APPLY;
    }

    if (current.subscriptionId !== next.subscriptionId) {
        // A late `deleted` for a subscription the customer already replaced must not
        // take down the one they are paying for now.
        if (isLiveSubscription(current) && !isLiveSubscription(next)) {
            return skip("older-subscription-ended");
        }
        return APPLY;
    }

    if (TERMINAL_STATUSES.includes(current.status)) {
        return skip("terminal");
    }

    // `created` and the first `updated` can share the same second; `created` is by
    // definition the oldest state of a subscription already on file.
    if (eventType === "customer.subscription.created") {
        return skip("created-after-known");
    }

    if (next.lastEventAt.getTime() < current.lastEventAtMs) {
        return skip("stale");
    }

    return APPLY;
}
