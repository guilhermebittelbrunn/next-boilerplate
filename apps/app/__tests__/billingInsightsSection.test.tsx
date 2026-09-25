import type { BillingSummaryDTO } from "@repo/sdk/src/types";
import { cleanup, render, screen } from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { billingMock } = vi.hoisted(() => ({ billingMock: vi.fn() }));

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push: vi.fn() }),
    useParams: () => ({ locale: "pt-br" }),
}));

/** The client dictionary reads the locale from the `x-locale` cookie. */
function setLocaleCookie(locale: string) {
    // biome-ignore lint/suspicious/noDocumentCookie: the dictionary reads this exact cookie
    document.cookie = `x-locale=${locale}; path=/`;
}

/**
 * The chart is loaded through `next/dynamic`, which never resolves inside this runner.
 * The stub stands in for the deferred bundle.
 */
vi.mock("next/dynamic", () => ({
    default: () => {
        const Stub = () => <div data-testid="plans-chart" />;
        return Stub;
    },
}));

vi.mock(
    "@/app/[locale]/(authenticated)/(admin)/admin/(pages)/(hooks)/useBillingSummary",
    () => ({ useBillingSummary: () => billingMock() })
);

const { BillingInsightsSection } = await import(
    "@/app/[locale]/(authenticated)/(admin)/admin/(pages)/(components)/BillingInsightsSection"
);

const SERVICE_UNAVAILABLE = 503;
const MONEY_SPACE = /\s/;
const RECEIVED_IN_RE = /Recebido em/;
const MISSING_INVOICE_EVENT_RE =
    /Confira se o evento invoice\.paid está cadastrado/;
const CRITERIA_RE = /Não desconta reembolsos/;
const NO_CONVERSION_RE = /sem conversão/;
const PENDING_PAYMENT_RE = /pagamento pendente/;

type EnabledSummary = Extract<BillingSummaryDTO, { enabled: true }>;

function enabledSummary(
    overrides: Partial<EnabledSummary> = {}
): EnabledSummary {
    return {
        enabled: true,
        recentActivations: [
            {
                subscriptionId: "sub_2",
                priceId: "price_pro",
                planName: "Pro",
                interval: "month",
                intervalCount: 1,
                activatedAt: "2026-09-24T14:02:11.000Z",
                subscriber: {
                    profileId: "p9",
                    displayName: "Ana",
                    email: "ana@example.com",
                },
            },
            {
                subscriptionId: "sub_1",
                priceId: "price_basic",
                planName: null,
                interval: null,
                intervalCount: null,
                activatedAt: "2026-09-20T10:00:00.000Z",
                subscriber: null,
            },
        ],
        plans: [
            {
                priceId: "price_pro",
                productId: "prod_pro",
                name: "Pro",
                interval: "month",
                intervalCount: 1,
                count: 12,
            },
            {
                priceId: "price_basic",
                productId: null,
                name: null,
                interval: "month",
                intervalCount: 1,
                count: 3,
            },
        ],
        revenue: {
            periodStart: "2026-09-01T00:00:00.000Z",
            periodEnd: "2026-10-01T00:00:00.000Z",
            byCurrency: [
                { currency: "brl", amountPaid: 5800, invoiceCount: 2 },
            ],
            trackingSince: "2026-08-30T09:12:00.000Z",
        },
        ...overrides,
    };
}

const EMPTY_REVENUE = {
    periodStart: "2026-09-01T00:00:00.000Z",
    periodEnd: "2026-10-01T00:00:00.000Z",
    byCurrency: [],
    trackingSince: null,
};

function givenBilling(state: {
    data?: BillingSummaryDTO;
    isLoading?: boolean;
    error?: unknown;
}) {
    billingMock.mockReturnValue({
        data: state.data,
        isLoading: state.isLoading ?? false,
        error: state.error ?? null,
    });
}

function missingIndexRejection(): AxiosError {
    const error = new AxiosError("Request failed");
    error.response = {
        data: { error: { code: "SUMMARY_INDEX_MISSING" } },
        status: SERVICE_UNAVAILABLE,
        statusText: "Service Unavailable",
        headers: {},
        config: { headers: new AxiosHeaders() },
    };
    return error;
}

function normalizedText(): string {
    return (document.body.textContent ?? "").replace(/\s/g, " ");
}

beforeEach(() => {
    cleanup();
    billingMock.mockReset();
    setLocaleCookie("pt-br");
    vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "subscription");
    givenBilling({ data: enabledSummary() });
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("BillingInsightsSection quando a cobrança não existe", () => {
    it("não renderiza nada no modo simple", () => {
        vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "simple");

        const { container } = render(<BillingInsightsSection />);

        expect(container.innerHTML).toBe("");
    });

    it("não renderiza título, esqueleto nem zero com a cobrança desligada", () => {
        givenBilling({ data: { enabled: false } });

        const { container } = render(<BillingInsightsSection />);

        expect(container.innerHTML).toBe("");
    });
});

describe("BillingInsightsSection carregando e com erro", () => {
    it("mostra o título e esqueletos enquanto carrega", () => {
        givenBilling({ isLoading: true });

        render(<BillingInsightsSection />);

        expect(screen.getByRole("heading", { level: 2 }).textContent).toBe(
            "Cobrança"
        );
        expect(
            document.querySelectorAll('[data-slot="skeleton"]').length
        ).toBeGreaterThan(0);
    });

    it("mostra a mensagem traduzida do índice ausente", () => {
        givenBilling({ error: missingIndexRejection() });

        render(<BillingInsightsSection />);

        expect(
            screen.getByText(
                "O resumo está indisponível no momento. Tente de novo em instantes."
            )
        ).toBeTruthy();
        expect(screen.getByText("Cobrança")).toBeTruthy();
    });
});

describe("BillingInsightsSection sem nenhuma venda", () => {
    it("mostra um único cartão de orientação, sem valores", () => {
        givenBilling({
            data: enabledSummary({
                plans: [],
                recentActivations: [],
                revenue: EMPTY_REVENUE,
            }),
        });

        render(<BillingInsightsSection />);

        expect(screen.getByText("Nenhuma assinatura ainda")).toBeTruthy();
        expect(normalizedText()).toContain("invoice.paid");
        expect(normalizedText()).not.toContain("R$");
        expect(screen.queryByText("Planos mais vendidos")).toBeNull();
        expect(screen.queryByText(RECEIVED_IN_RE)).toBeNull();
    });
});

describe("BillingInsightsSection com assinaturas mas sem fatura", () => {
    it("avisa para conferir o evento invoice.paid", () => {
        givenBilling({
            data: enabledSummary({
                recentActivations: [],
                revenue: EMPTY_REVENUE,
            }),
        });

        render(<BillingInsightsSection />);

        expect(screen.getByText(MISSING_INVOICE_EVENT_RE)).toBeTruthy();
        expect(screen.getByText("Nenhuma fatura paga neste mês.")).toBeTruthy();
        expect(
            screen.getByText("Nenhuma contratação registrada ainda.")
        ).toBeTruthy();
    });

    it("não avisa quando já há fatura registrada", () => {
        render(<BillingInsightsSection />);

        expect(screen.queryByText(MISSING_INVOICE_EVENT_RE)).toBeNull();
    });
});

describe("BillingInsightsSection com dados", () => {
    it("mostra o recebido no mês, em reais, com o critério e a data de início", () => {
        render(<BillingInsightsSection />);

        expect(screen.getByText("Recebido em setembro de 2026")).toBeTruthy();
        expect(normalizedText()).toContain("R$ 58,00");
        expect(screen.getByText(CRITERIA_RE)).toBeTruthy();
        expect(
            screen.getByText("Contando desde 30 de ago. de 2026.")
        ).toBeTruthy();
    });

    it("mostra moedas diferentes em linhas separadas, com a nota de sem conversão", () => {
        givenBilling({
            data: enabledSummary({
                revenue: {
                    ...enabledSummary().revenue,
                    byCurrency: [
                        { currency: "brl", amountPaid: 5800, invoiceCount: 2 },
                        { currency: "usd", amountPaid: 1900, invoiceCount: 1 },
                    ],
                },
            }),
        });

        render(<BillingInsightsSection />);

        const rows = [...document.querySelectorAll("li")]
            .map((item) => (item.textContent ?? "").replace(MONEY_SPACE, " "))
            .filter((text) => text.includes("$"));
        expect(rows).toEqual(["R$ 58,00", "US$ 19,00"]);
        expect(screen.getByText(NO_CONVERSION_RE)).toBeTruthy();
    });

    it("não divide por 100 a moeda sem casas decimais", () => {
        setLocaleCookie("en");
        givenBilling({
            data: enabledSummary({
                revenue: {
                    ...enabledSummary().revenue,
                    byCurrency: [
                        { currency: "jpy", amountPaid: 500, invoiceCount: 1 },
                    ],
                },
            }),
        });

        render(<BillingInsightsSection />);

        expect(normalizedText()).toContain("¥500");
    });

    it.each([
        ["en", "Received in September 2026", "Removed user", "Unnamed plan"],
        [
            "es",
            "Recibido en septiembre de 2026",
            "Usuario eliminado",
            "Plan sin nombre",
        ],
    ])("traduz a seção em %s", (locale, title, removed, unnamed) => {
        setLocaleCookie(locale);

        render(<BillingInsightsSection />);

        expect(screen.getByText(title)).toBeTruthy();
        expect(screen.getByText(removed)).toBeTruthy();
        expect(screen.getAllByText(new RegExp(unnamed)).length).toBeGreaterThan(
            0
        );
    });

    it("lista as contratações com usuário, plano e data, e o removido como tal", () => {
        render(<BillingInsightsSection />);

        expect(screen.getByText("Ana")).toBeTruthy();
        expect(screen.getByText("Pro · mensal")).toBeTruthy();
        expect(screen.getByText("24 de set. de 2026")).toBeTruthy();
        expect(screen.getByText("Usuário removido")).toBeTruthy();
    });

    it("mostra o gráfico e a lista de planos com nome, intervalo e contagem", () => {
        render(<BillingInsightsSection />);

        expect(screen.getByTestId("plans-chart")).toBeTruthy();
        expect(screen.getByText("Planos mais vendidos")).toBeTruthy();
        expect(screen.getByText(PENDING_PAYMENT_RE)).toBeTruthy();
        expect(screen.getByText("12")).toBeTruthy();
        expect(screen.getByText("mensal · price_basic")).toBeTruthy();
    });

    it("cai no e-mail quando o assinante não tem nome", () => {
        givenBilling({
            data: enabledSummary({
                recentActivations: [
                    {
                        ...enabledSummary().recentActivations[0],
                        subscriber: {
                            profileId: "p9",
                            displayName: null,
                            email: "ana@example.com",
                        },
                    } as EnabledSummary["recentActivations"][number],
                ],
            }),
        });

        render(<BillingInsightsSection />);

        expect(screen.getByText("ana@example.com")).toBeTruthy();
    });
});
