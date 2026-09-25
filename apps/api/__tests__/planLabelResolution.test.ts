import type { Stripe } from "@repo/payments";
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    type MockInstance,
    vi,
} from "vitest";

const { findMock, saveMock, retrieveMock } = vi.hoisted(() => ({
    findMock: vi.fn(),
    saveMock: vi.fn(),
    retrieveMock: vi.fn(),
}));

vi.mock("@/(shared)/repositories/plan-label.repository", () => ({
    planLabelRepository: {
        find: (...args: unknown[]) => findMock(...args),
        save: (...args: unknown[]) => saveMock(...args),
    },
}));

const { ensurePlanLabel, PLAN_LABEL_TIMEOUT_MS } = await import(
    "@/(shared)/lib/plan-label"
);

const NOW = new Date("2026-09-25T12:00:00.000Z");
const MS_PER_DAY = 86_400_000;
const TTL_DAYS = 7;
const FRESH_AGE_DAYS = TTL_DAYS - 1;
const STALE_AGE_DAYS = 30;
const EXPECTED_TIMEOUT_MS = 3000;

const stripe = {
    prices: { retrieve: (...args: unknown[]) => retrieveMock(...args) },
} as unknown as Stripe;

const PRICE = {
    id: "price_pro",
    nickname: null,
    recurring: { interval: "month", interval_count: 1 },
    product: { id: "prod_pro", object: "product", active: true, name: "Pro" },
};

function cachedAt(ageDays: number) {
    return {
        id: "price_pro",
        name: "Pro antigo",
        productId: "prod_pro",
        interval: "month",
        intervalCount: 1,
        resolvedAt: new Date(
            NOW.getTime() - ageDays * MS_PER_DAY
        ).toISOString(),
    };
}

let warn: MockInstance<typeof console.warn>;

beforeEach(() => {
    findMock.mockReset();
    saveMock.mockReset();
    retrieveMock.mockReset();
    findMock.mockResolvedValue(null);
    saveMock.mockResolvedValue(undefined);
    retrieveMock.mockResolvedValue(PRICE);
    warn = vi.spyOn(console, "warn").mockImplementation(() => {
        return;
    });
});

afterEach(() => {
    warn.mockRestore();
});

describe("ensurePlanLabel", () => {
    it("não chama a Stripe quando o nome em cache tem menos de 7 dias", async () => {
        findMock.mockResolvedValue(cachedAt(FRESH_AGE_DAYS));

        await ensurePlanLabel(stripe, "price_pro", "req-1", NOW);

        expect(retrieveMock).not.toHaveBeenCalled();
        expect(saveMock).not.toHaveBeenCalled();
    });

    it("busca o preço com o produto expandido, teto de tempo e sem retry, e grava", async () => {
        await ensurePlanLabel(stripe, "price_pro", "req-1", NOW);

        expect(PLAN_LABEL_TIMEOUT_MS).toBe(EXPECTED_TIMEOUT_MS);
        expect(retrieveMock).toHaveBeenCalledWith(
            "price_pro",
            { expand: ["product"] },
            { timeout: EXPECTED_TIMEOUT_MS, maxNetworkRetries: 0 }
        );
        expect(saveMock).toHaveBeenCalledWith("price_pro", {
            name: "Pro",
            productId: "prod_pro",
            interval: "month",
            intervalCount: 1,
        });
    });

    it("renova o nome em cache com 7 dias ou mais", async () => {
        findMock.mockResolvedValue(cachedAt(TTL_DAYS));

        await ensurePlanLabel(stripe, "price_pro", "req-1", NOW);

        expect(retrieveMock).toHaveBeenCalledTimes(1);
        expect(saveMock).toHaveBeenCalledTimes(1);
    });

    it("engole a falha da Stripe, mantém o cache e registra só o tipo do erro", async () => {
        findMock.mockResolvedValue(cachedAt(STALE_AGE_DAYS));
        retrieveMock.mockRejectedValue(
            Object.assign(new Error("Invalid API Key provided: sk_test_***"), {
                type: "StripeAuthenticationError",
            })
        );

        await expect(
            ensurePlanLabel(stripe, "price_pro", "req-1", NOW)
        ).resolves.toBeUndefined();

        expect(saveMock).not.toHaveBeenCalled();
        expect(warn).toHaveBeenCalledWith(
            "[payments] plan-label-unresolved requestId=req-1 reason=StripeAuthenticationError"
        );
    });

    it("engole a falha do Firestore ao ler o cache", async () => {
        findMock.mockRejectedValue(new TypeError("firestore down"));

        await expect(
            ensurePlanLabel(stripe, "price_pro", null, NOW)
        ).resolves.toBeUndefined();

        expect(warn).toHaveBeenCalledWith(
            "[payments] plan-label-unresolved reason=TypeError"
        );
    });
});
