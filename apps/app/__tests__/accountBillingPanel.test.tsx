import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
    panelMock,
    listPlansMock,
    checkoutMutateMock,
    portalMutateMock,
    mutationsState,
    confirmationMock,
    searchParamsMock,
} = vi.hoisted(() => ({
    panelMock: vi.fn(),
    listPlansMock: vi.fn(),
    checkoutMutateMock: vi.fn(),
    portalMutateMock: vi.fn(),
    mutationsState: {
        checkout: {
            isPending: false,
            isSuccess: false,
            variables: undefined as { priceId: string } | undefined,
        },
        portal: { isPending: false, isSuccess: false },
    },
    confirmationMock: vi.fn(),
    searchParamsMock: vi.fn(),
}));

vi.mock("@/shared/providers/AuthRequestPanelContext", () => ({
    useAuthRequestPanel: () => panelMock(),
}));

vi.mock("next/navigation", () => ({
    useSearchParams: () => searchParamsMock(),
}));

vi.mock(
    "@/app/[locale]/(authenticated)/(common)/(pages)/account/(hooks)/useListPlans",
    () => ({
        useListPlans: () => listPlansMock(),
    })
);

vi.mock(
    "@/app/[locale]/(authenticated)/(common)/(pages)/account/(hooks)/useCheckoutConfirmation",
    () => ({
        useCheckoutConfirmation: (waiting: boolean) =>
            confirmationMock(waiting),
    })
);

vi.mock(
    "@/app/[locale]/(authenticated)/(common)/(pages)/account/(hooks)/usePaymentsMutations",
    () => ({
        usePaymentsMutations: () => ({
            checkoutMutation: {
                mutate: checkoutMutateMock,
                ...mutationsState.checkout,
            },
            portalMutation: {
                mutate: portalMutateMock,
                ...mutationsState.portal,
            },
        }),
    })
);

const { AccountBillingPanel } = await import(
    "@/app/[locale]/(authenticated)/(common)/(pages)/account/(components)/AccountBillingPanel"
);
const { globalTranslations } = await import(
    "@repo/internationalization/translations/global"
);

const billingCopy =
    globalTranslations["pt-br"].apps.app.pages.common.account.billing;

const PRO_PLAN = {
    priceId: "price_pro",
    productId: "prod_pro",
    name: "Pro",
    description: "Para times pequenos",
    features: ["5 membros"],
    unitAmount: 2900,
    currency: "brl",
    interval: "month" as const,
    intervalCount: 1,
};
const BUSINESS_PLAN = {
    ...PRO_PLAN,
    priceId: "price_business",
    productId: "prod_business",
    name: "Business",
    unitAmount: 9900,
};

function subscription(overrides: Record<string, unknown> = {}) {
    return {
        subscriptionId: "sub_qa",
        status: "active",
        priceId: "price_pro",
        productId: "prod_pro",
        unitAmount: 2900,
        currency: "brl",
        interval: "month",
        intervalCount: 1,
        currentPeriodEnd: "2026-10-24T12:00:00.000Z",
        cancelAtPeriodEnd: false,
        lastEventAt: "2026-09-24T12:00:00.000Z",
        ...overrides,
    };
}

const accountWith = (overrides: Record<string, unknown> = {}) =>
    ({ id: "profile-1", ...overrides }) as never;

const plain = (value: string | null) => value?.replace(/\s/g, " ") ?? "";

function catalog(plans = [PRO_PLAN, BUSINESS_PLAN]) {
    listPlansMock.mockReturnValue({
        data: { enabled: true, plans },
        isLoading: false,
        isError: false,
    });
}

beforeEach(() => {
    vi.clearAllMocks();
    mutationsState.checkout = {
        isPending: false,
        isSuccess: false,
        variables: undefined,
    };
    mutationsState.portal = { isPending: false, isSuccess: false };
    panelMock.mockReturnValue({ isImpersonating: false });
    searchParamsMock.mockReturnValue(new URLSearchParams("tab=billing"));
    catalog();
});

afterEach(cleanup);

describe("AccountBillingPanel — carga e modo degradado", () => {
    it("mostra o skeleton enquanto os planos carregam", () => {
        listPlansMock.mockReturnValue({
            data: undefined,
            isLoading: true,
            isError: false,
        });

        const { container } = render(
            <AccountBillingPanel account={accountWith()} />
        );

        expect(
            container.querySelectorAll('[data-slot="skeleton"]').length
        ).toBeGreaterThan(0);
        expect(screen.queryByText(billingCopy.plansTitle)).toBeNull();
    });

    it("com a cobrança desligada, mostra o mesmo placeholder de antes", () => {
        listPlansMock.mockReturnValue({
            data: { enabled: false, plans: [] },
            isLoading: false,
            isError: false,
        });

        render(<AccountBillingPanel account={accountWith()} />);

        expect(screen.getByText(billingCopy.emptyTitle)).toBeTruthy();
        expect(screen.getByText(billingCopy.emptyDescription)).toBeTruthy();
        expect(screen.queryByRole("button")).toBeNull();
    });

    it("diz que não carregou quando a Stripe falha e não há assinatura", () => {
        listPlansMock.mockReturnValue({
            data: undefined,
            isLoading: false,
            isError: true,
        });

        render(<AccountBillingPanel account={accountWith()} />);

        expect(screen.getByText(billingCopy.loadError)).toBeTruthy();
        expect(screen.queryByText(billingCopy.noPlans)).toBeNull();
    });

    it("mantém o plano atual quando a listagem falha", () => {
        listPlansMock.mockReturnValue({
            data: undefined,
            isLoading: false,
            isError: true,
        });

        render(
            <AccountBillingPanel
                account={accountWith({ subscription: subscription() })}
            />
        );

        expect(screen.getByText(billingCopy.currentPlan)).toBeTruthy();
        expect(screen.getByText(billingCopy.unknownPlan)).toBeTruthy();
        expect(
            screen.getByRole("button", { name: billingCopy.manage })
        ).toBeTruthy();
    });

    it("avisa quando o catálogo está vazio", () => {
        catalog([]);

        render(<AccountBillingPanel account={accountWith()} />);

        expect(screen.getByText(billingCopy.noPlans)).toBeTruthy();
    });
});

describe("AccountBillingPanel — sem assinatura viva", () => {
    it("lista os planos com preço e botão de assinar", () => {
        render(<AccountBillingPanel account={accountWith()} />);

        expect(screen.getByText("Pro")).toBeTruthy();
        expect(screen.getByText("Business")).toBeTruthy();
        expect(
            screen.getByText((text) => plain(text) === "R$ 29,00 / mês")
        ).toBeTruthy();
        expect(
            screen.getAllByRole("button", { name: billingCopy.subscribe })
        ).toHaveLength(2);
    });

    it("dispara o checkout do plano clicado", () => {
        render(<AccountBillingPanel account={accountWith()} />);

        fireEvent.click(
            screen.getAllByRole("button", { name: billingCopy.subscribe })[1]
        );

        expect(checkoutMutateMock).toHaveBeenCalledWith({
            priceId: "price_business",
        });
    });

    it("oferece os planos de novo depois de uma assinatura cancelada", () => {
        render(
            <AccountBillingPanel
                account={accountWith({
                    subscription: subscription({ status: "canceled" }),
                })}
            />
        );

        expect(screen.queryByText(billingCopy.currentPlan)).toBeNull();
        expect(
            screen.getAllByRole("button", { name: billingCopy.subscribe })
        ).toHaveLength(2);
    });

    it("trava todos os botões de plano enquanto redireciona", () => {
        mutationsState.checkout = {
            isPending: true,
            isSuccess: false,
            variables: { priceId: "price_pro" },
        };

        const { container } = render(
            <AccountBillingPanel account={accountWith()} />
        );

        const buttons = container.querySelectorAll("button");
        expect(buttons).toHaveLength(2);
        for (const button of buttons) {
            expect(button.disabled).toBe(true);
        }
    });

    it("continua travado depois do sucesso, até a página sair", () => {
        mutationsState.checkout = {
            isPending: false,
            isSuccess: true,
            variables: { priceId: "price_pro" },
        };

        const { container } = render(
            <AccountBillingPanel account={accountWith()} />
        );

        for (const button of container.querySelectorAll("button")) {
            expect(button.disabled).toBe(true);
        }
    });

    it("desabilita assinar durante personificação", () => {
        panelMock.mockReturnValue({ isImpersonating: true });

        render(<AccountBillingPanel account={accountWith()} />);

        for (const button of screen.getAllByRole("button", {
            name: billingCopy.subscribe,
        })) {
            expect((button as HTMLButtonElement).disabled).toBe(true);
        }
    });
});

describe("AccountBillingPanel — assinatura viva", () => {
    it("mostra o plano atual pelo priceId, com preço, status e renovação", () => {
        render(
            <AccountBillingPanel
                account={accountWith({ subscription: subscription() })}
            />
        );

        expect(screen.getByText(billingCopy.currentPlan)).toBeTruthy();
        expect(screen.getByText("Pro")).toBeTruthy();
        expect(screen.getByText(billingCopy.status.active)).toBeTruthy();
        expect(
            screen.getByText((text) =>
                text.startsWith(billingCopy.renewsOn.replace("{date}", ""))
            )
        ).toBeTruthy();
        expect(
            screen.queryByRole("button", { name: billingCopy.subscribe })
        ).toBeNull();
    });

    it("diz quando termina se o cancelamento está agendado", () => {
        render(
            <AccountBillingPanel
                account={accountWith({
                    subscription: subscription({ cancelAtPeriodEnd: true }),
                })}
            />
        );

        expect(
            screen.getByText((text) =>
                text.startsWith(billingCopy.endsOn.replace("{date}", ""))
            )
        ).toBeTruthy();
    });

    it("omite a data quando o fim do período não veio", () => {
        render(
            <AccountBillingPanel
                account={accountWith({
                    subscription: subscription({ currentPeriodEnd: null }),
                })}
            />
        );

        expect(
            screen.queryByText((text) =>
                text.startsWith(billingCopy.renewsOn.replace("{date}", ""))
            )
        ).toBeNull();
    });

    it.each(["past_due", "unpaid"] as const)(
        "%s mostra o badge e o pedido de atualizar o cartão",
        (status) => {
            render(
                <AccountBillingPanel
                    account={accountWith({
                        subscription: subscription({ status }),
                    })}
                />
            );

            expect(screen.getByText(billingCopy.status[status])).toBeTruthy();
            expect(screen.getByText(billingCopy.pastDueHint)).toBeTruthy();
        }
    );

    it("abre o portal no clique de gerenciar", () => {
        render(
            <AccountBillingPanel
                account={accountWith({ subscription: subscription() })}
            />
        );

        fireEvent.click(
            screen.getByRole("button", { name: billingCopy.manage })
        );

        expect(portalMutateMock).toHaveBeenCalledTimes(1);
    });

    it("desabilita gerenciar durante personificação", () => {
        panelMock.mockReturnValue({ isImpersonating: true });

        render(
            <AccountBillingPanel
                account={accountWith({ subscription: subscription() })}
            />
        );

        const manage = screen.getByRole("button", {
            name: billingCopy.manage,
        }) as HTMLButtonElement;
        expect(manage.disabled).toBe(true);
    });
});

describe("AccountBillingPanel — volta do checkout", () => {
    it("com success e sem assinatura ainda, avisa que está confirmando e revalida", () => {
        searchParamsMock.mockReturnValue(
            new URLSearchParams("tab=billing&checkout=success")
        );

        render(<AccountBillingPanel account={accountWith()} />);

        expect(screen.getByText(billingCopy.checkoutPending)).toBeTruthy();
        expect(confirmationMock).toHaveBeenLastCalledWith(true);
    });

    it("com success e a assinatura já viva, confirma e para de revalidar", () => {
        searchParamsMock.mockReturnValue(
            new URLSearchParams("tab=billing&checkout=success")
        );

        render(
            <AccountBillingPanel
                account={accountWith({ subscription: subscription() })}
            />
        );

        expect(screen.getByText(billingCopy.checkoutConfirmed)).toBeTruthy();
        expect(confirmationMock).toHaveBeenLastCalledWith(false);
    });

    it("com canceled, avisa que nada foi cobrado", () => {
        searchParamsMock.mockReturnValue(
            new URLSearchParams("tab=billing&checkout=canceled")
        );

        render(<AccountBillingPanel account={accountWith()} />);

        expect(screen.getByText(billingCopy.checkoutCanceled)).toBeTruthy();
        expect(confirmationMock).toHaveBeenLastCalledWith(false);
    });

    it("com success e sem assinatura viva, trava assinar para não abrir uma segunda assinatura", () => {
        searchParamsMock.mockReturnValue(
            new URLSearchParams("tab=billing&checkout=success")
        );

        render(<AccountBillingPanel account={accountWith()} />);

        const subscribeButtons = screen.getAllByRole("button", {
            name: billingCopy.subscribe,
        }) as HTMLButtonElement[];
        expect(subscribeButtons).toHaveLength(2);
        for (const button of subscribeButtons) {
            expect(button.disabled).toBe(true);
        }

        fireEvent.click(subscribeButtons[0]);
        expect(checkoutMutateMock).not.toHaveBeenCalled();
    });

    it("com success e assinatura anterior cancelada, também trava assinar", () => {
        searchParamsMock.mockReturnValue(
            new URLSearchParams("tab=billing&checkout=success")
        );

        render(
            <AccountBillingPanel
                account={accountWith({
                    subscription: subscription({ status: "canceled" }),
                })}
            />
        );

        expect(screen.getByText(billingCopy.checkoutPending)).toBeTruthy();
        for (const button of screen.getAllByRole("button", {
            name: billingCopy.subscribe,
        })) {
            expect((button as HTMLButtonElement).disabled).toBe(true);
        }
        expect(confirmationMock).toHaveBeenLastCalledWith(true);
    });

    it("com success e a assinatura já viva, libera gerenciar", () => {
        searchParamsMock.mockReturnValue(
            new URLSearchParams("tab=billing&checkout=success")
        );

        render(
            <AccountBillingPanel
                account={accountWith({ subscription: subscription() })}
            />
        );

        const manage = screen.getByRole("button", {
            name: billingCopy.manage,
        }) as HTMLButtonElement;
        expect(manage.disabled).toBe(false);
    });

    it.each(["tab=billing", "tab=billing&checkout=canceled"])(
        "com %s, assinar continua habilitado",
        (query) => {
            searchParamsMock.mockReturnValue(new URLSearchParams(query));

            render(<AccountBillingPanel account={accountWith()} />);

            const subscribeButtons = screen.getAllByRole("button", {
                name: billingCopy.subscribe,
            }) as HTMLButtonElement[];
            for (const button of subscribeButtons) {
                expect(button.disabled).toBe(false);
            }

            fireEvent.click(subscribeButtons[0]);
            expect(checkoutMutateMock).toHaveBeenCalledWith({
                priceId: "price_pro",
            });
        }
    );

    it("sem o parâmetro, não mostra aviso nem revalida", () => {
        render(<AccountBillingPanel account={accountWith()} />);

        expect(screen.queryByRole("alert")).toBeNull();
        expect(confirmationMock).toHaveBeenLastCalledWith(false);
    });
});
