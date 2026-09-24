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
