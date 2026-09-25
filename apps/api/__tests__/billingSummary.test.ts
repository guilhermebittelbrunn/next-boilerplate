import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    listRecentMock,
    countLiveMock,
    identifyMock,
    listPaidBetweenMock,
    firstPaidAtMock,
    findByPriceIdsMock,
} = vi.hoisted(() => ({
    listRecentMock: vi.fn(),
    countLiveMock: vi.fn(),
    identifyMock: vi.fn(),
    listPaidBetweenMock: vi.fn(),
    firstPaidAtMock: vi.fn(),
    findByPriceIdsMock: vi.fn(),
}));

vi.mock("@/(shared)/repositories/subscription-activation.repository", () => ({
    subscriptionActivationRepository: {
        listRecent: (...args: unknown[]) => listRecentMock(...args),
    },
}));

vi.mock("@/(shared)/repositories/user.repository", () => ({
    userRepository: {
        countLiveSubscriptionsByPrice: (...args: unknown[]) =>
            countLiveMock(...args),
        identifyByStripeCustomerIds: (...args: unknown[]) =>
            identifyMock(...args),
    },
}));

vi.mock("@/(shared)/repositories/paid-invoice.repository", () => ({
    paidInvoiceRepository: {
        listPaidBetween: (...args: unknown[]) => listPaidBetweenMock(...args),
        firstPaidAt: (...args: unknown[]) => firstPaidAtMock(...args),
    },
}));

vi.mock("@/(shared)/repositories/plan-label.repository", () => ({
    planLabelRepository: {
        findByPriceIds: (...args: unknown[]) => findByPriceIdsMock(...args),
    },
}));

const {
    buildBillingSummary,
    RECENT_ACTIVATIONS_LIMIT,
    rankPlanCounts,
    sumByCurrency,
    toActivationDTO,
    utcMonthRange,
} = await import("@/(shared)/lib/billing-summary");

const PRO_LABEL = {
    name: "Pro",
    productId: "prod_pro",
    interval: "year" as const,
    intervalCount: 1,
};

const BASIC_COUNT = 3;
const PRO_COUNT = 12;
const EXPECTED_RECENT_LIMIT = 5;

function planCount(priceId: string | null, count: number) {
    return {
        priceId,
        productId: null,
        interval: "month" as const,
        intervalCount: 1,
        count,
    };
}

beforeEach(() => {
    for (const mock of [
        listRecentMock,
        countLiveMock,
        identifyMock,
        listPaidBetweenMock,
        firstPaidAtMock,
        findByPriceIdsMock,
    ]) {
        mock.mockReset();
    }
    listRecentMock.mockResolvedValue([]);
    countLiveMock.mockResolvedValue([]);
    identifyMock.mockResolvedValue(new Map());
    listPaidBetweenMock.mockResolvedValue([]);
    firstPaidAtMock.mockResolvedValue(null);
    findByPriceIdsMock.mockResolvedValue(new Map());
});

describe("utcMonthRange", () => {
    it("fecha o mês no primeiro instante do mês seguinte, em UTC", () => {
        expect(utcMonthRange(new Date("2026-09-30T23:59:59.999Z"))).toEqual({
            start: new Date("2026-09-01T00:00:00.000Z"),
            end: new Date("2026-10-01T00:00:00.000Z"),
        });
    });

    it("o primeiro milissegundo do dia 1 já é do mês seguinte", () => {
        expect(
            utcMonthRange(new Date("2026-10-01T00:00:00.000Z")).start
        ).toEqual(new Date("2026-10-01T00:00:00.000Z"));
    });

    it("vira o ano de dezembro para janeiro", () => {
        expect(utcMonthRange(new Date("2026-12-15T10:00:00.000Z"))).toEqual({
            start: new Date("2026-12-01T00:00:00.000Z"),
            end: new Date("2027-01-01T00:00:00.000Z"),
        });
    });

    it("fevereiro bissexto termina no dia 29", () => {
        const { end } = utcMonthRange(new Date("2028-02-29T23:59:59.999Z"));

        expect(end).toEqual(new Date("2028-03-01T00:00:00.000Z"));
    });
});

describe("sumByCurrency", () => {
    it("soma uma moeda e conta as faturas", () => {
        expect(
            sumByCurrency([
                { amountPaid: 2900, currency: "brl" },
                { amountPaid: 2900, currency: "brl" },
            ])
        ).toEqual([{ currency: "brl", amountPaid: 5800, invoiceCount: 2 }]);
    });

    it("mantém moedas diferentes separadas, da maior para a menor", () => {
        expect(
            sumByCurrency([
                { amountPaid: 1900, currency: "usd" },
                { amountPaid: 2900, currency: "brl" },
                { amountPaid: 2900, currency: "BRL" },
            ])
        ).toEqual([
            { currency: "brl", amountPaid: 5800, invoiceCount: 2 },
            { currency: "usd", amountPaid: 1900, invoiceCount: 1 },
        ]);
    });

    it("conta a fatura de valor zero sem inventar valor", () => {
        expect(sumByCurrency([{ amountPaid: 0, currency: "brl" }])).toEqual([
            { currency: "brl", amountPaid: 0, invoiceCount: 1 },
        ]);
    });

    it("devolve lista vazia sem faturas", () => {
        expect(sumByCurrency([])).toEqual([]);
    });
});

describe("rankPlanCounts", () => {
    it("ordena pela contagem e usa o nome e o intervalo do cache", () => {
        const ranked = rankPlanCounts(
            [
                planCount("price_basic", BASIC_COUNT),
                planCount("price_pro", PRO_COUNT),
            ],
            new Map([["price_pro", PRO_LABEL]])
        );

        expect(ranked).toEqual([
            {
                priceId: "price_pro",
                productId: "prod_pro",
                name: "Pro",
                interval: "year",
                intervalCount: 1,
                count: PRO_COUNT,
            },
            {
                priceId: "price_basic",
                productId: null,
                name: null,
                interval: "month",
                intervalCount: 1,
                count: BASIC_COUNT,
            },
        ]);
    });

    it("no empate, o plano com nome vem antes do sem nome", () => {
        const ranked = rankPlanCounts(
            [planCount("price_basic", 2), planCount("price_pro", 2)],
            new Map([["price_pro", PRO_LABEL]])
        );

        expect(ranked.map((plan) => plan.priceId)).toEqual([
            "price_pro",
            "price_basic",
        ]);
    });
});

describe("toActivationDTO", () => {
    const activation = {
        id: "sub_qa",
        customerId: "cus_qa",
        priceId: "price_pro",
        activatedAt: "2026-09-20T10:00:00.000Z",
    };

    it("junta plano e assinante", () => {
        const subscriber = {
            profileId: "p1",
            displayName: "Ana",
            email: "ana@example.com",
        };

        expect(
            toActivationDTO(
                activation,
                new Map([["price_pro", PRO_LABEL]]),
                new Map([["cus_qa", subscriber]])
            )
        ).toEqual({
            subscriptionId: "sub_qa",
            priceId: "price_pro",
            planName: "Pro",
            interval: "year",
            intervalCount: 1,
            activatedAt: "2026-09-20T10:00:00.000Z",
            subscriber,
        });
    });

    it("assinante ausente vira null, e plano sem cache fica sem nome", () => {
        const dto = toActivationDTO(activation, new Map(), new Map());

        expect(dto.subscriber).toBeNull();
        expect(dto.planName).toBeNull();
    });
});

describe("buildBillingSummary", () => {
    it("lê o mês UTC corrente, as 5 últimas ativações e os nomes de todos os preços citados", async () => {
        listRecentMock.mockResolvedValue([
            {
                id: "sub_qa",
                customerId: "cus_qa",
                priceId: "price_basic",
                activatedAt: "2026-09-20T10:00:00.000Z",
            },
        ]);
        countLiveMock.mockResolvedValue([planCount("price_pro", 1)]);
        listPaidBetweenMock.mockResolvedValue([
            { amountPaid: 2900, currency: "brl" },
        ]);
        firstPaidAtMock.mockResolvedValue("2026-08-30T09:12:00.000Z");

        const summary = await buildBillingSummary(
            new Date("2026-09-25T12:00:00.000Z")
        );

        expect(listRecentMock).toHaveBeenCalledWith(RECENT_ACTIVATIONS_LIMIT);
        expect(RECENT_ACTIVATIONS_LIMIT).toBe(EXPECTED_RECENT_LIMIT);
        expect(listPaidBetweenMock).toHaveBeenCalledWith(
            new Date("2026-09-01T00:00:00.000Z"),
            new Date("2026-10-01T00:00:00.000Z")
        );
        expect(findByPriceIdsMock).toHaveBeenCalledWith([
            "price_pro",
            "price_basic",
        ]);
        expect(identifyMock).toHaveBeenCalledWith(["cus_qa"]);
        expect(summary.revenue).toEqual({
            periodStart: "2026-09-01T00:00:00.000Z",
            periodEnd: "2026-10-01T00:00:00.000Z",
            byCurrency: [
                { currency: "brl", amountPaid: 2900, invoiceCount: 1 },
            ],
            trackingSince: "2026-08-30T09:12:00.000Z",
        });
        expect(summary.recentActivations[0]?.subscriber).toBeNull();
        expect(summary.plans).toHaveLength(1);
    });
});
