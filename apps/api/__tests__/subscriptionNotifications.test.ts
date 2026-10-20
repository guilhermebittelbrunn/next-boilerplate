import type {
    SubscriptionState,
    SubscriptionStatus,
} from "@repo/sdk/src/types";
import { describe, expect, it } from "vitest";
import { subscriptionNotificationFor } from "@/(shared)/lib/subscription-notifications";

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
        lastEventAt: new Date("2026-10-20T12:00:00.000Z"),
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
        cancelAtPeriodEnd: false,
        ...overrides,
    };
}

describe("subscriptionNotificationFor", () => {
    it.each(["past_due", "unpaid"] as const)(
        "avisa pagamento pendente quando a assinatura ativa vai a %s",
        (status) => {
            expect(
                subscriptionNotificationFor(stored("active"), next(status))
            ).toBe("subscriptionPaymentPending");
        }
    );

    it("não repete o aviso de pagamento pendente de past_due para unpaid", () => {
        expect(
            subscriptionNotificationFor(stored("past_due"), next("unpaid"))
        ).toBeNull();
    });

    it("avisa pagamento pendente de uma assinatura que chega já pendente", () => {
        expect(subscriptionNotificationFor(undefined, next("past_due"))).toBe(
            "subscriptionPaymentPending"
        );
    });

    it("avisa o cancelamento quando a assinatura de fato termina", () => {
        expect(
            subscriptionNotificationFor(stored("active"), next("canceled"))
        ).toBe("subscriptionCanceled");
        expect(
            subscriptionNotificationFor(stored("past_due"), next("canceled"))
        ).toBe("subscriptionCanceled");
    });

    it("não avisa o cancelamento de uma assinatura já cancelada", () => {
        expect(
            subscriptionNotificationFor(stored("canceled"), next("canceled"))
        ).toBeNull();
    });

    it("não avisa o cancelamento de uma assinatura que o perfil não conhecia", () => {
        expect(
            subscriptionNotificationFor(undefined, next("canceled"))
        ).toBeNull();
        expect(
            subscriptionNotificationFor(
                stored("active", { subscriptionId: "sub_old" }),
                next("canceled")
            )
        ).toBeNull();
    });

    it.each(["active", "trialing"] as const)(
        "avisa a reativação quando o pagamento pendente se resolve em %s",
        (status) => {
            expect(
                subscriptionNotificationFor(stored("past_due"), next(status))
            ).toBe("subscriptionReactivated");
            expect(
                subscriptionNotificationFor(stored("unpaid"), next(status))
            ).toBe("subscriptionReactivated");
        }
    );

    it("avisa a reativação quando o cancelamento agendado é desfeito", () => {
        expect(
            subscriptionNotificationFor(
                stored("active", { cancelAtPeriodEnd: true }),
                next("active", { cancelAtPeriodEnd: false })
            )
        ).toBe("subscriptionReactivated");
    });

    it("não avisa o cancelamento agendado", () => {
        expect(
            subscriptionNotificationFor(
                stored("active"),
                next("active", { cancelAtPeriodEnd: true })
            )
        ).toBeNull();
    });

    it("não avisa a primeira assinatura ativa", () => {
        expect(
            subscriptionNotificationFor(undefined, next("active"))
        ).toBeNull();
        expect(subscriptionNotificationFor(null, next("trialing"))).toBeNull();
    });

    it("não avisa a ativação depois do checkout incompleto", () => {
        expect(
            subscriptionNotificationFor(stored("incomplete"), next("active"))
        ).toBeNull();
    });

    it("trata a assinatura anterior de outro id como ausente", () => {
        expect(
            subscriptionNotificationFor(
                stored("past_due", { subscriptionId: "sub_old" }),
                next("active")
            )
        ).toBeNull();
    });

    it("não avisa uma renovação comum", () => {
        expect(
            subscriptionNotificationFor(stored("active"), next("active"))
        ).toBeNull();
    });
});
