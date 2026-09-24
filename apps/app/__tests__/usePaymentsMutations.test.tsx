import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePaymentsMutations } from "@/app/[locale]/(authenticated)/(common)/(pages)/account/(hooks)/usePaymentsMutations";

const { createCheckoutMock, openPortalMock, errorAlertMock, assignMock } =
    vi.hoisted(() => ({
        createCheckoutMock: vi.fn(),
        openPortalMock: vi.fn(),
        errorAlertMock: vi.fn(),
        assignMock: vi.fn(),
    }));

vi.mock("@/shared/lib/client", () => ({
    apiClient: {
        payments: {
            createCheckout: (...args: unknown[]) => createCheckoutMock(...args),
            openPortal: (...args: unknown[]) => openPortalMock(...args),
        },
    },
}));

vi.mock("@repo/design-system/hooks/useAlert", () => ({
    default: () => ({ errorAlert: errorAlertMock, successAlert: vi.fn() }),
}));

vi.mock("@repo/internationalization/client", () => ({
    getDictionary: () => ({ dictionary: {}, locale: "es" }),
}));

vi.mock("@repo/shared/utils/helpers/handleClientError", () => ({
    handleClientError: (error: { message: string }) =>
        `traduzido: ${error.message}`,
}));

vi.mock("@repo/shared/utils/helpers/formattedError", () => ({
    default: class {
        message: string;
        constructor(error: { code?: string }) {
            this.message = error.code ?? "unknown";
        }
    },
}));

let queryClient: QueryClient;
const originalLocation = window.location;

function wrapper({ children }: { children: ReactNode }) {
    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}

beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
        defaultOptions: { mutations: { retry: false } },
    });
    Object.defineProperty(window, "location", {
        configurable: true,
        value: { ...originalLocation, assign: assignMock },
    });
});

afterEach(() => {
    Object.defineProperty(window, "location", {
        configurable: true,
        value: originalLocation,
    });
});

describe("usePaymentsMutations — checkout", () => {
    it("pede a sessão com o plano e o idioma da tela e navega para a Stripe", async () => {
        createCheckoutMock.mockResolvedValue({
            url: "https://checkout.stripe.com/c/pay/cs_test_qa",
        });
        const { result } = renderHook(() => usePaymentsMutations(), {
            wrapper,
        });

        result.current.checkoutMutation.mutate({ priceId: "price_pro" });

        await waitFor(() =>
            expect(assignMock).toHaveBeenCalledWith(
                "https://checkout.stripe.com/c/pay/cs_test_qa"
            )
        );
        expect(createCheckoutMock).toHaveBeenCalledWith({
            priceId: "price_pro",
            locale: "es",
        });
        expect(errorAlertMock).not.toHaveBeenCalled();
    });

    it("mostra o erro traduzido e não navega quando a API recusa", async () => {
        createCheckoutMock.mockRejectedValue({
            code: "PAYMENTS_SUBSCRIPTION_ALREADY_ACTIVE",
        });
        const { result } = renderHook(() => usePaymentsMutations(), {
            wrapper,
        });

        result.current.checkoutMutation.mutate({ priceId: "price_pro" });

        await waitFor(() =>
            expect(errorAlertMock).toHaveBeenCalledWith(
                "traduzido: PAYMENTS_SUBSCRIPTION_ALREADY_ACTIVE"
            )
        );
        expect(assignMock).not.toHaveBeenCalled();
    });
});

describe("usePaymentsMutations — portal", () => {
    it("abre o portal no idioma da tela", async () => {
        openPortalMock.mockResolvedValue({
            url: "https://billing.stripe.com/p/session/test_qa",
        });
        const { result } = renderHook(() => usePaymentsMutations(), {
            wrapper,
        });

        result.current.portalMutation.mutate();

        await waitFor(() =>
            expect(assignMock).toHaveBeenCalledWith(
                "https://billing.stripe.com/p/session/test_qa"
            )
        );
        expect(openPortalMock).toHaveBeenCalledWith({ locale: "es" });
    });

    it("mostra o erro traduzido quando a Stripe não responde", async () => {
        openPortalMock.mockRejectedValue({
            code: "PAYMENTS_PROVIDER_UNAVAILABLE",
        });
        const { result } = renderHook(() => usePaymentsMutations(), {
            wrapper,
        });

        result.current.portalMutation.mutate();

        await waitFor(() =>
            expect(errorAlertMock).toHaveBeenCalledWith(
                "traduzido: PAYMENTS_PROVIDER_UNAVAILABLE"
            )
        );
        expect(assignMock).not.toHaveBeenCalled();
    });
});
