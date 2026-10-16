import type { Stripe } from "@repo/payments";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { pricesListMock } = vi.hoisted(() => ({ pricesListMock: vi.fn() }));

vi.mock("@repo/payments", () => ({
    isPaymentsConfigured: () => true,
}));

vi.mock("@/env", () => ({ env: {} }));

vi.mock("@/(shared)/repositories/user.repository", () => ({
    userRepository: {},
}));

const { CATALOG_TTL_MS, listPlansCached, resetPlanCatalogCache } = await import(
    "@/(shared)/lib/plan-catalog-cache"
);

const PRO_AMOUNT = 2900;
const CONCURRENT_VISITS = 5;

const stripe = { prices: { list: pricesListMock } } as unknown as Stripe;

function recurringPrice(id: string, unitAmount: number) {
    return {
        id,
        active: true,
        currency: "brl",
        unit_amount: unitAmount,
        recurring: { interval: "month", interval_count: 1 },
        product: {
            id: `prod_${id}`,
            active: true,
            name: `Plano ${id}`,
            description: null,
            marketing_features: [],
        },
    };
}

beforeEach(() => {
    vi.useFakeTimers();
    resetPlanCatalogCache();
    pricesListMock.mockReset();
    pricesListMock.mockResolvedValue({
        data: [recurringPrice("price_pro", PRO_AMOUNT)],
    });
});

afterEach(() => {
    vi.useRealTimers();
});

describe("listPlansCached", () => {
    it("pede o catálogo à Stripe uma vez dentro da validade", async () => {
        const first = await listPlansCached(stripe);
        const second = await listPlansCached(stripe);

        expect(pricesListMock).toHaveBeenCalledTimes(1);
        expect(second).toEqual(first);
        expect(first.map((plan) => plan.priceId)).toEqual(["price_pro"]);
    });

    it("pede de novo depois de uma hora", async () => {
        await listPlansCached(stripe);

        vi.advanceTimersByTime(CATALOG_TTL_MS - 1);
        await listPlansCached(stripe);
        expect(pricesListMock).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(2);
        await listPlansCached(stripe);
        expect(pricesListMock).toHaveBeenCalledTimes(2);
    });

    it("faz uma chamada só para visitas simultâneas com o cache vazio", async () => {
        const visits = Array.from({ length: CONCURRENT_VISITS }, () =>
            listPlansCached(stripe)
        );

        await Promise.all(visits);

        expect(pricesListMock).toHaveBeenCalledTimes(1);
    });

    it("não guarda a falha: a visita seguinte tenta de novo e recebe os planos", async () => {
        pricesListMock.mockRejectedValueOnce(new Error("provider down"));

        await expect(listPlansCached(stripe)).rejects.toThrow("provider down");
        const plans = await listPlansCached(stripe);

        expect(pricesListMock).toHaveBeenCalledTimes(2);
        expect(plans.map((plan) => plan.priceId)).toEqual(["price_pro"]);
    });
});
