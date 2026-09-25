import type { UserPreferences } from "../user/user";

export const SUBSCRIPTION_STATUSES = [
    "active",
    "trialing",
    "past_due",
    "unpaid",
    "paused",
    "incomplete",
    "incomplete_expired",
    "canceled",
] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/**
 * Statuses in which the customer still holds the plan or is still being billed for it.
 * A second checkout in any of them would open a duplicate subscription.
 */
export const LIVE_SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = [
    "active",
    "trialing",
    "past_due",
    "unpaid",
    "paused",
];

export type PlanInterval = "day" | "week" | "month" | "year";

export type SubscriptionState = {
    subscriptionId: string;
    status: SubscriptionStatus;
    priceId: string | null;
    productId: string | null;
    /** In the smallest unit of `currency` (cents for BRL, whole yen for JPY). */
    unitAmount: number | null;
    currency: string | null;
    interval: PlanInterval | null;
    intervalCount: number | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
    /** Creation instant of the provider event that produced this snapshot. */
    lastEventAt: Date;
};

export type SubscriptionStateDTO = Omit<
    SubscriptionState,
    "currentPeriodEnd" | "lastEventAt"
> & {
    currentPeriodEnd: string | null;
    lastEventAt: string;
};

export type PlanDTO = {
    priceId: string;
    productId: string;
    name: string;
    description: string | null;
    features: string[];
    unitAmount: number | null;
    currency: string;
    interval: PlanInterval;
    intervalCount: number;
};

/** `enabled: false` means billing is switched off in this environment, not that it failed. */
export type PaymentPlansDTO = {
    enabled: boolean;
    plans: PlanDTO[];
};

export type CreateCheckoutRequest = {
    priceId: string;
    locale?: UserPreferences["locale"];
};

export type OpenPortalRequest = {
    locale?: UserPreferences["locale"];
};

export type PaymentRedirectDTO = {
    url: string;
};

/** `name` is null until the payments webhook resolved it from the provider. */
export type BillingPlanCountDTO = {
    priceId: string | null;
    productId: string | null;
    name: string | null;
    interval: PlanInterval | null;
    intervalCount: number | null;
    count: number;
};

export type BillingSubscriberDTO = {
    profileId: string;
    displayName: string | null;
    email: string | null;
};

export type BillingActivationDTO = {
    subscriptionId: string;
    priceId: string | null;
    planName: string | null;
    interval: PlanInterval | null;
    intervalCount: number | null;
    /** First paid invoice of the subscription, ISO. */
    activatedAt: string;
    /** Null when the profile was deleted or never linked to the customer. */
    subscriber: BillingSubscriberDTO | null;
};

export type BillingRevenueByCurrencyDTO = {
    /** Lowercase ISO 4217 code, as the provider sends it. */
    currency: string;
    /** In the smallest unit of `currency`. */
    amountPaid: number;
    invoiceCount: number;
};

/** Paid invoices of one calendar month in UTC, `[periodStart, periodEnd)`. */
export type BillingRevenueDTO = {
    periodStart: string;
    periodEnd: string;
    byCurrency: BillingRevenueByCurrencyDTO[];
    /** Earliest paid invoice on record; null when none was ever received. */
    trackingSince: string | null;
};

export type BillingSummaryDataDTO = {
    recentActivations: BillingActivationDTO[];
    plans: BillingPlanCountDTO[];
    revenue: BillingRevenueDTO;
};

/** `enabled: false` means billing is switched off in this environment, not that it failed. */
export type BillingSummaryDTO =
    | { enabled: false }
    | ({ enabled: true } & BillingSummaryDataDTO);
