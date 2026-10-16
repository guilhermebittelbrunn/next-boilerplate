import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { REQUEST_ID_HEADER } from "@repo/shared/utils/helpers/request-id";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getStripeMock, isPaymentsConfiguredMock, pricesListMock, envMock } =
    vi.hoisted(() => ({
        getStripeMock: vi.fn(),
        isPaymentsConfiguredMock: vi.fn(),
        pricesListMock: vi.fn(),
        envMock: {
            NEXT_PUBLIC_APP_URL: "http://localhost:3000" as string | undefined,
        },
    }));

vi.mock("@/(shared)/repositories/user.repository", () => ({
    userRepository: {},
}));

vi.mock("@repo/payments", () => ({
    getStripe: () => getStripeMock(),
    isPaymentsConfigured: () => isPaymentsConfiguredMock(),
}));

vi.mock("@/env", () => ({ env: envMock }));

const { GET } = await import("@/app/(routes)/payments/catalog/route");
const { resetPlanCatalogCache } = await import(
    "@/(shared)/lib/plan-catalog-cache"
);

const PRO_AMOUNT = 2900;
const BUSINESS_AMOUNT = 9900;
const ARCHIVED_AMOUNT = 100;
const REQUEST_ID = "req-catalog-1";
const PLAN_DTO_KEYS = [
    "currency",
    "description",
    "features",
    "interval",
    "intervalCount",
    "name",
    "priceId",
    "productId",
    "unitAmount",
];

function recurringPrice(id: string, unitAmount: number | null, active = true) {
    return {
        id,
        active: true,
        currency: "brl",
        unit_amount: unitAmount,
        lookup_key: `lookup_${id}`,
        metadata: { internal: "do-not-leak" },
        recurring: { interval: "month", interval_count: 1 },
        product: {
            id: `prod_${id}`,
            active,
            name: `Plano ${id}`,
            description: null,
            marketing_features: [{ name: "Suporte por e-mail" }],
            metadata: { internal: "do-not-leak" },
        },
    };
}

/** No session headers at all: the landing's server calls this for anonymous visitors. */
function anonymousRequest(): Request {
    return new Request("http://localhost:3002/payments/catalog", {
        method: "GET",
        headers: { [REQUEST_ID_HEADER]: REQUEST_ID },
    });
}

async function dataOf(response: Response) {
    const body = (await response.json()) as {
        data: { enabled: boolean; plans: Record<string, unknown>[] };
    };
    return body.data;
}

beforeEach(() => {
    for (const mock of [
        getStripeMock,
        isPaymentsConfiguredMock,
        pricesListMock,
    ]) {
        mock.mockReset();
    }
    resetPlanCatalogCache();
    envMock.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    getStripeMock.mockReturnValue({ prices: { list: pricesListMock } });
    isPaymentsConfiguredMock.mockReturnValue(true);
    pricesListMock.mockResolvedValue({ data: [] });
});

afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

describe("GET /payments/catalog — cobrança desligada", () => {
    it("responde 200 enabled=false sem chave da Stripe e não chama a Stripe", async () => {
        getStripeMock.mockReturnValue(null);
        isPaymentsConfiguredMock.mockReturnValue(false);

        const response = await GET(anonymousRequest());

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(await dataOf(response)).toEqual({ enabled: false, plans: [] });
        expect(pricesListMock).not.toHaveBeenCalled();
    });

    it("responde enabled=false com só a chave secreta, sem o segredo do webhook", async () => {
        isPaymentsConfiguredMock.mockReturnValue(false);

        const response = await GET(anonymousRequest());

        expect(await dataOf(response)).toEqual({ enabled: false, plans: [] });
        expect(pricesListMock).not.toHaveBeenCalled();
    });

    it("responde enabled=false no modo simple, mesmo com as chaves", async () => {
        vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "simple");

        const response = await GET(anonymousRequest());

        expect(await dataOf(response)).toEqual({ enabled: false, plans: [] });
        expect(pricesListMock).not.toHaveBeenCalled();
    });

    it("responde enabled=false sem a URL do app", async () => {
        envMock.NEXT_PUBLIC_APP_URL = undefined;

        const response = await GET(anonymousRequest());

        expect(await dataOf(response)).toEqual({ enabled: false, plans: [] });
        expect(pricesListMock).not.toHaveBeenCalled();
    });
});

describe("GET /payments/catalog — cobrança ligada", () => {
    it("responde 200 sem credencial, ordenado e sem produto arquivado", async () => {
        pricesListMock.mockResolvedValue({
            data: [
                recurringPrice("price_business", BUSINESS_AMOUNT),
                recurringPrice("price_archived", ARCHIVED_AMOUNT, false),
                recurringPrice("price_pro", PRO_AMOUNT),
            ],
        });

        const response = await GET(anonymousRequest());
        const data = await dataOf(response);

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(data.enabled).toBe(true);
        expect(data.plans.map((plan) => plan.priceId)).toEqual([
            "price_pro",
            "price_business",
        ]);
    });

    it("expõe só os campos de catálogo de cada plano", async () => {
        pricesListMock.mockResolvedValue({
            data: [recurringPrice("price_pro", PRO_AMOUNT)],
        });

        const data = await dataOf(await GET(anonymousRequest()));

        expect(Object.keys(data.plans[0]).sort()).toEqual(PLAN_DTO_KEYS);
        expect(JSON.stringify(data)).not.toContain("do-not-leak");
    });

    it("duas requisições seguidas pedem o catálogo à Stripe uma vez", async () => {
        pricesListMock.mockResolvedValue({
            data: [recurringPrice("price_pro", PRO_AMOUNT)],
        });

        const first = await dataOf(await GET(anonymousRequest()));
        const second = await dataOf(await GET(anonymousRequest()));

        expect(pricesListMock).toHaveBeenCalledTimes(1);
        expect(second).toEqual(first);
    });

    it("responde enabled=true com catálogo vazio", async () => {
        const response = await GET(anonymousRequest());

        expect(await dataOf(response)).toEqual({ enabled: true, plans: [] });
    });

    it("responde 503 com código e linha de log quando a Stripe falha, nunca 500", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {
            return;
        });
        pricesListMock.mockRejectedValue(
            Object.assign(new Error("Invalid API Key provided"), {
                type: "StripeAuthenticationError",
            })
        );

        const response = await GET(anonymousRequest());

        expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
        expect(await response.json()).toEqual({
            error: { code: "PAYMENTS_PROVIDER_UNAVAILABLE" },
        });
        expect(warn).toHaveBeenCalledWith(
            `[payments] catalog-failed requestId=${REQUEST_ID}`
        );
    });
});
