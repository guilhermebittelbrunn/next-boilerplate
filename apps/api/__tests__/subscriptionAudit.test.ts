import {
    AuditAction,
    type SubscriptionState,
    type SubscriptionStatus,
} from "@repo/sdk/src/types";
import { describe, expect, it } from "vitest";
import { subscriptionAuditActionsFor } from "@/(shared)/lib/subscription-audit";

function next(
    status: SubscriptionStatus,
    overrides: Partial<SubscriptionState> = {}
): SubscriptionState {
    return {
        subscriptionId: "sub_1",
        status,
        priceId: "price_pro",
        productId: "prod_pro",
        unitAmount: 2900,
        currency: "brl",
        interval: "month",
        intervalCount: 1,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        lastEventAt: new Date("2026-11-26T12:00:00.000Z"),
        ...overrides,
    };
}

function stored(
    status: string,
    overrides: Record<string, unknown> = {}
): Record<string, unknown> {
    return {
        subscriptionId: "sub_1",
        status,
        priceId: "price_pro",
        cancelAtPeriodEnd: false,
        ...overrides,
    };
}

describe("subscriptionAuditActionsFor", () => {
    it("records the activation of a first subscription", () => {
        expect(subscriptionAuditActionsFor(undefined, next("active"))).toEqual([
            AuditAction.SUBSCRIPTION_ACTIVATE,
        ]);
    });

    it("counts the start of a trial as the activation", () => {
        expect(
            subscriptionAuditActionsFor(undefined, next("trialing"))
        ).toEqual([AuditAction.SUBSCRIPTION_ACTIVATE]);
    });

    it("does not record the trial turning into a paid subscription", () => {
        expect(
            subscriptionAuditActionsFor(stored("trialing"), next("active"))
        ).toEqual([]);
    });

    it("records an incomplete subscription that became active", () => {
        expect(
            subscriptionAuditActionsFor(stored("incomplete"), next("active"))
        ).toEqual([AuditAction.SUBSCRIPTION_ACTIVATE]);
    });

    it("reads a snapshot of another subscription as absent", () => {
        expect(
            subscriptionAuditActionsFor(
                stored("canceled", { subscriptionId: "sub_old" }),
                next("active")
            )
        ).toEqual([AuditAction.SUBSCRIPTION_ACTIVATE]);
    });

    it("does not call a recovered payment an activation", () => {
        expect(
            subscriptionAuditActionsFor(stored("past_due"), next("active"))
        ).toEqual([]);
        expect(
            subscriptionAuditActionsFor(stored("unpaid"), next("active"))
        ).toEqual([]);
    });

    it("records a plan change when the price moves", () => {
        expect(
            subscriptionAuditActionsFor(
                stored("active", { priceId: "price_basic" }),
                next("active")
            )
        ).toEqual([AuditAction.SUBSCRIPTION_PLAN_CHANGE]);
    });

    it("does not call a missing price a plan change", () => {
        expect(
            subscriptionAuditActionsFor(
                stored("active", { priceId: null }),
                next("active")
            )
        ).toEqual([]);
        expect(
            subscriptionAuditActionsFor(
                stored("active"),
                next("active", { priceId: null })
            )
        ).toEqual([]);
    });

    it("records a scheduled cancellation once", () => {
        expect(
            subscriptionAuditActionsFor(
                stored("active"),
                next("active", { cancelAtPeriodEnd: true })
            )
        ).toEqual([AuditAction.SUBSCRIPTION_CANCELLATION_SCHEDULE]);
        expect(
            subscriptionAuditActionsFor(
                stored("active", { cancelAtPeriodEnd: true }),
                next("active", { cancelAtPeriodEnd: true })
            )
        ).toEqual([]);
    });

    it("records the end of a subscription that was running", () => {
        expect(
            subscriptionAuditActionsFor(
                stored("active", { cancelAtPeriodEnd: true }),
                next("canceled", { cancelAtPeriodEnd: true })
            )
        ).toEqual([AuditAction.SUBSCRIPTION_END]);
    });

    it("records nothing for a cancellation it never saw start", () => {
        expect(
            subscriptionAuditActionsFor(undefined, next("canceled"))
        ).toEqual([]);
    });

    it("records nothing when the same state arrives again", () => {
        expect(
            subscriptionAuditActionsFor(stored("active"), next("active"))
        ).toEqual([]);
        expect(
            subscriptionAuditActionsFor(stored("canceled"), next("canceled"))
        ).toEqual([]);
    });

    it("records activation and scheduled cancellation together when both arrive at once", () => {
        expect(
            subscriptionAuditActionsFor(
                undefined,
                next("active", { cancelAtPeriodEnd: true })
            )
        ).toEqual([
            AuditAction.SUBSCRIPTION_ACTIVATE,
            AuditAction.SUBSCRIPTION_CANCELLATION_SCHEDULE,
        ]);
    });
});
