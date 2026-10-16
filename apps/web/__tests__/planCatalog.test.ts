import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    type MockInstance,
    vi,
} from "vitest";

const { listCatalogMock, envMock } = vi.hoisted(() => ({
    listCatalogMock: vi.fn(),
    envMock: {
        NEXT_PUBLIC_API_URL: "http://localhost:3002" as string | undefined,
    },
}));

vi.mock("@/env", () => ({ env: envMock }));

vi.mock("@/shared/lib/client", () => ({
    apiClient: {
        payments: { listCatalog: () => listCatalogMock() },
    },
}));

const { loadPlanCatalog } = await import("@/shared/lib/planCatalog");

const SERVICE_UNAVAILABLE = 503;
const PRO_PLAN = {
    priceId: "price_pro",
    productId: "prod_pro",
    name: "Pro",
    description: null,
    features: [],
    unitAmount: 2900,
    currency: "brl",
    interval: "month" as const,
    intervalCount: 1,
};

let warn: MockInstance<typeof console.warn>;

beforeEach(() => {
    listCatalogMock.mockReset();
    envMock.NEXT_PUBLIC_API_URL = "http://localhost:3002";
    warn = vi.spyOn(console, "warn").mockImplementation(() => {
        return;
    });
});

afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

describe("loadPlanCatalog", () => {
    it("no modo simple, não chama a API", async () => {
        vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "simple");

        expect(await loadPlanCatalog()).toEqual([]);
        expect(listCatalogMock).not.toHaveBeenCalled();
    });

    it.each(["", undefined])(
        "com NEXT_PUBLIC_API_URL=%j, não chama a API",
        async (apiUrl) => {
            envMock.NEXT_PUBLIC_API_URL = apiUrl;

            expect(await loadPlanCatalog()).toEqual([]);
            expect(listCatalogMock).not.toHaveBeenCalled();
        }
    );

    it("devolve os planos quando a cobrança está ligada", async () => {
        listCatalogMock.mockResolvedValue({ enabled: true, plans: [PRO_PLAN] });

        expect(await loadPlanCatalog()).toEqual([PRO_PLAN]);
    });

    it("devolve vazio quando a cobrança está desligada", async () => {
        listCatalogMock.mockResolvedValue({ enabled: false, plans: [] });

        expect(await loadPlanCatalog()).toEqual([]);
        expect(warn).not.toHaveBeenCalled();
    });

    it("devolve vazio e registra o status quando a API responde erro", async () => {
        listCatalogMock.mockRejectedValue(
            Object.assign(new Error("Request failed"), {
                code: "ERR_BAD_RESPONSE",
                response: { status: SERVICE_UNAVAILABLE },
            })
        );

        expect(await loadPlanCatalog()).toEqual([]);
        expect(warn).toHaveBeenCalledWith(
            "[payments] catalog-unavailable status=503 reason=ERR_BAD_RESPONSE"
        );
    });

    it("devolve vazio quando a API está fora do ar", async () => {
        listCatalogMock.mockRejectedValue(
            Object.assign(new Error("connect ECONNREFUSED"), {
                code: "ECONNREFUSED",
            })
        );

        expect(await loadPlanCatalog()).toEqual([]);
        expect(warn).toHaveBeenCalledWith(
            "[payments] catalog-unavailable reason=ECONNREFUSED"
        );
    });
});
