import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    type MockInstance,
    vi,
} from "vitest";

const {
    getStripeMock,
    getWebhookSecretMock,
    constructEventMock,
    headersMock,
    wasProcessedMock,
    markProcessedMock,
    findByIdMock,
    findByStripeCustomerIdMock,
    linkStripeCustomerMock,
    applySubscriptionStateMock,
    recordPaidInvoiceMock,
    recordActivationMock,
    ensurePlanLabelMock,
} = vi.hoisted(() => ({
    recordPaidInvoiceMock: vi.fn(),
    recordActivationMock: vi.fn(),
    ensurePlanLabelMock: vi.fn(),
    getStripeMock: vi.fn(),
    getWebhookSecretMock: vi.fn(),
    constructEventMock: vi.fn(),
    headersMock: vi.fn(),
    wasProcessedMock: vi.fn(),
    markProcessedMock: vi.fn(),
    findByIdMock: vi.fn(),
    findByStripeCustomerIdMock: vi.fn(),
    linkStripeCustomerMock: vi.fn(),
    applySubscriptionStateMock: vi.fn(),
}));

/** Records the order the route touched each collaborator in. */
const calls: string[] = [];

vi.mock("server-only", () => ({}));

vi.mock("@repo/payments", () => ({
    getStripe: () => getStripeMock(),
    getWebhookSecret: () => getWebhookSecretMock(),
}));

vi.mock("next/headers", () => ({
    headers: () => headersMock(),
}));

vi.mock("@/(shared)/repositories/payment-event.repository", () => ({
    paymentEventRepository: {
        wasProcessed: (...args: unknown[]) => wasProcessedMock(...args),
        markProcessed: (...args: unknown[]) => {
            calls.push("markProcessed");
            return markProcessedMock(...args);
        },
    },
}));

vi.mock("@/(shared)/repositories/user.repository", () => ({
    userRepository: {
        findById: (...args: unknown[]) => findByIdMock(...args),
        findByStripeCustomerId: (...args: unknown[]) =>
            findByStripeCustomerIdMock(...args),
        linkStripeCustomer: (...args: unknown[]) => {
            calls.push("linkStripeCustomer");
            return linkStripeCustomerMock(...args);
        },
        applySubscriptionState: (...args: unknown[]) => {
            calls.push("applySubscriptionState");
            return applySubscriptionStateMock(...args);
        },
    },
}));

vi.mock("@/(shared)/repositories/paid-invoice.repository", () => ({
    paidInvoiceRepository: {
        recordOnce: (...args: unknown[]) => {
            calls.push("recordPaidInvoice");
            return recordPaidInvoiceMock(...args);
        },
    },
}));

vi.mock("@/(shared)/repositories/subscription-activation.repository", () => ({
    subscriptionActivationRepository: {
        recordOnce: (...args: unknown[]) => {
            calls.push("recordActivation");
            return recordActivationMock(...args);
        },
    },
}));

vi.mock("@/(shared)/lib/plan-label", () => ({
    ensurePlanLabel: (...args: unknown[]) => {
        calls.push("ensurePlanLabel");
        return ensurePlanLabelMock(...args);
    },
}));

const { POST } = await import("@/app/(routes)/webhooks/payments/route");

const SIGNED_BODY = '{"id":"evt_qa"}';
const EVENT_CREATED = 1_780_000_000;
const PERIOD_END = 1_790_000_000;
const MS = 1000;

function request(body = SIGNED_BODY) {
    return new Request("http://localhost:3002/webhooks/payments", {
        method: "POST",
        body,
    });
}

function stripeClient() {
    return {
        webhooks: {
            constructEvent: (...args: unknown[]) => constructEventMock(...args),
        },
    };
}

function withSignature(signature: string | null) {
    headersMock.mockResolvedValue({ get: () => signature });
}

function subscriptionObject(overrides: Record<string, unknown> = {}) {
    return {
        id: "sub_qa",
        object: "subscription",
        status: "active",
        customer: "cus_qa",
        cancel_at_period_end: false,
        metadata: {},
        items: {
            data: [
                {
                    current_period_end: PERIOD_END,
                    price: {
                        id: "price_pro",
                        product: "prod_pro",
                        unit_amount: 2900,
                        currency: "brl",
                        recurring: { interval: "month", interval_count: 1 },
                    },
                },
            ],
        },
        ...overrides,
    };
}

function subscriptionEvent(
    type: string,
    overrides: Record<string, unknown> = {}
) {
    return {
        id: "evt_sub",
        type,
        created: EVENT_CREATED,
        data: { object: subscriptionObject(overrides) },
    };
}

const PROFILE = { id: "profile-1", stripeCustomerId: "cus_qa" };

let warn: MockInstance<typeof console.warn>;
let error: MockInstance<typeof console.error>;

beforeEach(() => {
    calls.length = 0;
    vi.clearAllMocks();
    getStripeMock.mockReturnValue(stripeClient());
    getWebhookSecretMock.mockReturnValue("whsec_qa");
    withSignature("t=1,v1=assinatura");
    wasProcessedMock.mockResolvedValue(false);
    markProcessedMock.mockResolvedValue(undefined);
    findByIdMock.mockResolvedValue({ id: "profile-1" });
    findByStripeCustomerIdMock.mockResolvedValue(PROFILE);
    linkStripeCustomerMock.mockResolvedValue(undefined);
    applySubscriptionStateMock.mockResolvedValue("applied");
    recordPaidInvoiceMock.mockResolvedValue("created");
    recordActivationMock.mockResolvedValue("created");
    ensurePlanLabelMock.mockResolvedValue(undefined);
    warn = vi.spyOn(console, "warn").mockImplementation(() => {
        return;
    });
    error = vi.spyOn(console, "error").mockImplementation(() => {
        return;
    });
});

afterEach(() => {
    warn.mockRestore();
    error.mockRestore();
    vi.unstubAllEnvs();
});

describe("POST /webhooks/payments — sem configuração", () => {
    it("responde 503 PAYMENTS_NOT_CONFIGURED quando não há cliente da Stripe", async () => {
        getStripeMock.mockReturnValue(null);

        const response = await POST(request());

        expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
        await expect(response.json()).resolves.toEqual({
            error: { code: "PAYMENTS_NOT_CONFIGURED" },
        });
        expect(constructEventMock).not.toHaveBeenCalled();
    });

    it("responde 503 PAYMENTS_NOT_CONFIGURED quando falta o segredo do webhook", async () => {
        getWebhookSecretMock.mockReturnValue(null);

        const response = await POST(request());

        expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
        await expect(response.json()).resolves.toEqual({
            error: { code: "PAYMENTS_NOT_CONFIGURED" },
        });
        expect(constructEventMock).not.toHaveBeenCalled();
    });

    it("não lê o corpo da requisição quando não está configurado", async () => {
        getStripeMock.mockReturnValue(null);

        const incoming = request();
        await POST(incoming);

        expect(incoming.bodyUsed).toBe(false);
    });
});

describe("POST /webhooks/payments — assinatura", () => {
    it("verifica o corpo cru contra a assinatura e o segredo do pacote de pagamentos", async () => {
        constructEventMock.mockReturnValue({
            id: "evt_qa",
            type: "checkout.session.completed",
            data: { object: { customer: "cus_1" } },
        });

        await POST(request());

        expect(constructEventMock).toHaveBeenCalledWith(
            SIGNED_BODY,
            "t=1,v1=assinatura",
            "whsec_qa"
        );
    });

    it("falha quando o header stripe-signature está ausente", async () => {
        withSignature(null);

        const response = await POST(request());

        expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
        await expect(response.json()).resolves.toEqual({
            message: "something went wrong",
            ok: false,
        });
        expect(constructEventMock).not.toHaveBeenCalled();
    });

    it("falha quando a assinatura não confere", async () => {
        constructEventMock.mockImplementation(() => {
            throw new Error("No signatures found matching the expected");
        });

        const response = await POST(request());

        expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
        await expect(response.json()).resolves.toEqual({
            message: "something went wrong",
            ok: false,
        });
        expect(markProcessedMock).not.toHaveBeenCalled();
    });

    it("não vaza a mensagem de erro da Stripe na resposta", async () => {
        constructEventMock.mockImplementation(() => {
            throw new Error("whsec_qa is invalid");
        });

        const response = await POST(request());
        const body = JSON.stringify(await response.json());

        expect(body).not.toContain("whsec_qa");
    });
});

describe("POST /webhooks/payments — despacho de eventos", () => {
    it("aceita checkout.session.completed sem ecoar o evento no corpo", async () => {
        const event = {
            id: "evt_qa",
            type: "checkout.session.completed",
            data: {
                object: { customer: "cus_1", customer_email: "a@example.com" },
            },
        };
        constructEventMock.mockReturnValue(event);

        const response = await POST(request());

        expect(response.status).toBe(HTTP_STATUS.OK);
        await expect(response.json()).resolves.toEqual({ ok: true });
    });

    it("registra subscription_schedule.canceled como não tratado: cancelar um schedule não cancela a assinatura", async () => {
        constructEventMock.mockReturnValue({
            id: "evt_schedule",
            type: "subscription_schedule.canceled",
            data: { object: { customer: "cus_1" } },
        });

        const response = await POST(request());

        await expect(response.json()).resolves.toMatchObject({ ok: true });
        expect(warn).toHaveBeenCalledWith(
            "[payments] webhook-unhandled-event eventType=subscription_schedule.canceled"
        );
        expect(applySubscriptionStateMock).not.toHaveBeenCalled();
    });

    it("aceita evento de checkout sem customer sem quebrar", async () => {
        constructEventMock.mockReturnValue({
            id: "evt_qa",
            type: "checkout.session.completed",
            data: { object: {} },
        });

        const response = await POST(request());

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(linkStripeCustomerMock).not.toHaveBeenCalled();
    });

    it("correlaciona a falha com o identificador que o proxy carimbou", async () => {
        const requestId = "3f2a1b8c-0f4a-4d0a-9e77-9f5f0a3a1c22";
        constructEventMock.mockImplementation(() => {
            throw new Error("No signatures found matching the expected");
        });

        await POST(
            new Request("http://localhost:3002/webhooks/payments", {
                method: "POST",
                body: SIGNED_BODY,
                headers: { "x-request-id": requestId },
            })
        );

        expect(warn).toHaveBeenCalledWith(
            `[payments] webhook-failed requestId=${requestId}`
        );
    });

    it("registra a falha sem campo vazio quando não há identificador", async () => {
        constructEventMock.mockImplementation(() => {
            throw new Error("No signatures found matching the expected");
        });

        await POST(request());

        expect(warn).toHaveBeenCalledWith("[payments] webhook-failed");
    });

    it("registra e aceita um tipo de evento não tratado", async () => {
        constructEventMock.mockReturnValue({
            id: "evt_invoice",
            type: "invoice.finalized",
            data: { object: {} },
        });

        const response = await POST(request());

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(warn).toHaveBeenCalledWith(
            "[payments] webhook-unhandled-event eventType=invoice.finalized"
        );
        expect(markProcessedMock).toHaveBeenCalledWith(
            expect.objectContaining({ id: "evt_invoice" })
        );
    });
});

describe("POST /webhooks/payments — idempotência", () => {
    it("responde duplicate sem rodar handler nem marcar de novo", async () => {
        wasProcessedMock.mockResolvedValue(true);
        constructEventMock.mockReturnValue(
            subscriptionEvent("customer.subscription.updated")
        );

        const response = await POST(request());

        expect(response.status).toBe(HTTP_STATUS.OK);
        await expect(response.json()).resolves.toEqual({
            ok: true,
            duplicate: true,
        });
        expect(wasProcessedMock).toHaveBeenCalledWith("evt_sub");
        expect(applySubscriptionStateMock).not.toHaveBeenCalled();
        expect(markProcessedMock).not.toHaveBeenCalled();
    });

    it("marca o evento só depois de o handler terminar", async () => {
        constructEventMock.mockReturnValue(
            subscriptionEvent("customer.subscription.updated")
        );

        await POST(request());

        expect(calls).toEqual([
            "applySubscriptionState",
            "ensurePlanLabel",
            "markProcessed",
        ]);
    });

    it("responde 500 e não marca quando o handler falha, para a Stripe reentregar", async () => {
        constructEventMock.mockReturnValue(
            subscriptionEvent("customer.subscription.updated")
        );
        applySubscriptionStateMock.mockRejectedValue(
            new Error("firestore down")
        );

        const response = await POST(request());

        expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
        expect(markProcessedMock).not.toHaveBeenCalled();
        expect(warn).toHaveBeenCalledWith(
            "[payments] webhook-handler-failed eventType=customer.subscription.updated"
        );
    });

    it("responde 500 quando a leitura do dedupe falha, sem rodar handler", async () => {
        constructEventMock.mockReturnValue(
            subscriptionEvent("customer.subscription.updated")
        );
        wasProcessedMock.mockRejectedValue(new Error("firestore down"));

        const response = await POST(request());

        expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
        expect(applySubscriptionStateMock).not.toHaveBeenCalled();
    });
});

describe("POST /webhooks/payments — checkout.session.completed", () => {
    function checkoutEvent(object: Record<string, unknown>) {
        return {
            id: "evt_checkout",
            type: "checkout.session.completed",
            created: EVENT_CREATED,
            data: { object },
        };
    }

    it("liga o cliente ao perfil de client_reference_id quando o vínculo falta", async () => {
        constructEventMock.mockReturnValue(
            checkoutEvent({
                customer: "cus_qa",
                client_reference_id: "profile-1",
            })
        );

        await POST(request());

        expect(findByIdMock).toHaveBeenCalledWith("profile-1");
        expect(linkStripeCustomerMock).toHaveBeenCalledWith(
            "profile-1",
            "cus_qa"
        );
    });

    it("usa metadata.profileId quando não há client_reference_id", async () => {
        constructEventMock.mockReturnValue(
            checkoutEvent({
                customer: { id: "cus_qa" },
                client_reference_id: null,
                metadata: { profileId: "profile-1" },
            })
        );

        await POST(request());

        expect(linkStripeCustomerMock).toHaveBeenCalledWith(
            "profile-1",
            "cus_qa"
        );
    });

    it("não reescreve o vínculo que já existe", async () => {
        findByIdMock.mockResolvedValue({
            id: "profile-1",
            stripeCustomerId: "cus_qa",
        });
        constructEventMock.mockReturnValue(
            checkoutEvent({
                customer: "cus_qa",
                client_reference_id: "profile-1",
            })
        );

        await POST(request());

        expect(linkStripeCustomerMock).not.toHaveBeenCalled();
    });

    it("responde 200, registra e marca quando o perfil não existe", async () => {
        findByIdMock.mockResolvedValue(null);
        constructEventMock.mockReturnValue(
            checkoutEvent({ customer: "cus_qa", client_reference_id: "gone" })
        );

        const response = await POST(request());

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(warn).toHaveBeenCalledWith(
            "[payments] webhook-profile-not-found eventType=checkout.session.completed"
        );
        expect(markProcessedMock).toHaveBeenCalled();
    });
});

describe("POST /webhooks/payments — customer.subscription.*", () => {
    it.each([
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
    ])("%s grava o snapshot no perfil achado pelo customer", async (type) => {
        constructEventMock.mockReturnValue(subscriptionEvent(type));

        const response = await POST(request());

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(findByStripeCustomerIdMock).toHaveBeenCalledWith("cus_qa");
        expect(applySubscriptionStateMock).toHaveBeenCalledWith(
            "profile-1",
            {
                subscriptionId: "sub_qa",
                status: "active",
                priceId: "price_pro",
                productId: "prod_pro",
                unitAmount: 2900,
                currency: "brl",
                interval: "month",
                intervalCount: 1,
                currentPeriodEnd: new Date(PERIOD_END * MS),
                cancelAtPeriodEnd: false,
                lastEventAt: new Date(EVENT_CREATED * MS),
            },
            type
        );
    });

    it("cai no metadata.profileId quando o customer ainda não está ligado, e liga", async () => {
        findByStripeCustomerIdMock.mockResolvedValue(null);
        findByIdMock.mockResolvedValue({ id: "profile-1" });
        constructEventMock.mockReturnValue(
            subscriptionEvent("customer.subscription.created", {
                metadata: { profileId: "profile-1" },
            })
        );

        await POST(request());

        expect(findByIdMock).toHaveBeenCalledWith("profile-1");
        expect(linkStripeCustomerMock).toHaveBeenCalledWith(
            "profile-1",
            "cus_qa"
        );
        expect(applySubscriptionStateMock).toHaveBeenCalledWith(
            "profile-1",
            expect.objectContaining({ subscriptionId: "sub_qa" }),
            "customer.subscription.created"
        );
    });

    it("responde 200, registra e marca quando nenhum perfil corresponde", async () => {
        findByStripeCustomerIdMock.mockResolvedValue(null);
        constructEventMock.mockReturnValue(
            subscriptionEvent("customer.subscription.updated")
        );

        const response = await POST(request());

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(applySubscriptionStateMock).not.toHaveBeenCalled();
        expect(warn).toHaveBeenCalledWith(
            "[payments] webhook-profile-not-found eventType=customer.subscription.updated"
        );
        expect(markProcessedMock).toHaveBeenCalled();
    });

    it("registra o resultado da reconciliação sem dado pessoal", async () => {
        applySubscriptionStateMock.mockResolvedValue("skipped");
        constructEventMock.mockReturnValue(
            subscriptionEvent("customer.subscription.updated")
        );

        await POST(request());

        expect(warn).toHaveBeenCalledWith(
            "[payments] webhook-subscription-reconciled eventType=customer.subscription.updated result=skipped"
        );
    });
});

const PAID_AT = 1_780_000_100;

function invoiceObject(overrides: Record<string, unknown> = {}) {
    return {
        id: "in_qa",
        object: "invoice",
        amount_paid: 2900,
        currency: "brl",
        billing_reason: "subscription_create",
        customer: "cus_qa",
        customer_email: "pessoa@example.com",
        customer_name: "Pessoa Real",
        status_transitions: { paid_at: PAID_AT },
        parent: {
            type: "subscription_details",
            subscription_details: { subscription: "sub_qa", metadata: {} },
        },
        lines: {
            object: "list",
            data: [
                {
                    subscription: "sub_qa",
                    pricing: {
                        type: "price_details",
                        price_details: {
                            price: "price_pro",
                            product: "prod_pro",
                        },
                    },
                },
            ],
        },
        ...overrides,
    };
}

function invoiceEvent(overrides: Record<string, unknown> = {}) {
    return {
        id: "evt_invoice_paid",
        type: "invoice.paid",
        created: EVENT_CREATED,
        data: { object: invoiceObject(overrides) },
    };
}

describe("POST /webhooks/payments — invoice.paid", () => {
    it("primeira cobrança grava a fatura e a ativação, depois marca o evento", async () => {
        constructEventMock.mockReturnValue(invoiceEvent());

        const response = await POST(request());

        expect(response.status).toBe(HTTP_STATUS.OK);
        await expect(response.json()).resolves.toEqual({ ok: true });
        expect(recordPaidInvoiceMock).toHaveBeenCalledWith({
            invoiceId: "in_qa",
            customerId: "cus_qa",
            subscriptionId: "sub_qa",
            priceId: "price_pro",
            billingReason: "subscription_create",
            amountPaid: 2900,
            currency: "brl",
            paidAt: new Date(PAID_AT * MS),
        });
        expect(recordActivationMock).toHaveBeenCalledWith({
            subscriptionId: "sub_qa",
            customerId: "cus_qa",
            priceId: "price_pro",
            activatedAt: new Date(PAID_AT * MS),
        });
        expect(calls).toEqual([
            "recordPaidInvoice",
            "recordActivation",
            "ensurePlanLabel",
            "markProcessed",
        ]);
    });

    it.each(["subscription_cycle", "subscription_update", "manual"])(
        "%s grava só a fatura, sem contratação nova",
        async (billingReason) => {
            constructEventMock.mockReturnValue(
                invoiceEvent({ billing_reason: billingReason })
            );

            const response = await POST(request());

            expect(response.status).toBe(HTTP_STATUS.OK);
            expect(recordPaidInvoiceMock).toHaveBeenCalledTimes(1);
            expect(recordActivationMock).not.toHaveBeenCalled();
        }
    );

    it("fatura avulsa sem assinatura nem preço grava só a fatura e não resolve nome", async () => {
        constructEventMock.mockReturnValue(
            invoiceEvent({
                parent: null,
                billing_reason: "subscription_create",
                lines: { object: "list", data: [] },
            })
        );

        await POST(request());

        expect(recordPaidInvoiceMock).toHaveBeenCalledTimes(1);
        expect(recordActivationMock).not.toHaveBeenCalled();
        expect(ensurePlanLabelMock).not.toHaveBeenCalled();
    });

    it("resolve o nome do plano pelo preço da fatura, com o cliente da Stripe já em mãos", async () => {
        constructEventMock.mockReturnValue(invoiceEvent());

        await POST(request());

        expect(ensurePlanLabelMock).toHaveBeenCalledWith(
            expect.objectContaining({ webhooks: expect.any(Object) }),
            "price_pro",
            null
        );
    });

    it("reprocessar a mesma fatura responde 200 e marca o evento", async () => {
        recordPaidInvoiceMock.mockResolvedValue("exists");
        recordActivationMock.mockResolvedValue("exists");
        constructEventMock.mockReturnValue(invoiceEvent());

        const response = await POST(request());

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(markProcessedMock).toHaveBeenCalledWith(
            expect.objectContaining({ id: "evt_invoice_paid" })
        );
    });

    it("falha ao gravar a fatura responde 500 e não marca, para a Stripe reentregar", async () => {
        recordPaidInvoiceMock.mockRejectedValue(new Error("firestore down"));
        constructEventMock.mockReturnValue(invoiceEvent());

        const response = await POST(request());

        expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
        expect(recordActivationMock).not.toHaveBeenCalled();
        expect(markProcessedMock).not.toHaveBeenCalled();
    });

    it("falha ao gravar a ativação responde 500 e não marca", async () => {
        recordActivationMock.mockRejectedValue(new Error("firestore down"));
        constructEventMock.mockReturnValue(invoiceEvent());

        const response = await POST(request());

        expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
        expect(markProcessedMock).not.toHaveBeenCalled();
    });

    it("duplicado não roda handler de fatura", async () => {
        wasProcessedMock.mockResolvedValue(true);
        constructEventMock.mockReturnValue(invoiceEvent());

        const response = await POST(request());

        await expect(response.json()).resolves.toEqual({
            ok: true,
            duplicate: true,
        });
        expect(recordPaidInvoiceMock).not.toHaveBeenCalled();
    });

    it("registra a gravação sem valor, e-mail nem nome", async () => {
        constructEventMock.mockReturnValue(invoiceEvent());

        const response = await POST(request());
        const body = JSON.stringify(await response.json());
        const logged = warn.mock.calls.flat().join("\n");

        expect(warn).toHaveBeenCalledWith(
            "[payments] webhook-invoice-recorded eventType=invoice.paid billingReason=subscription_create"
        );
        expect(logged).not.toContain("2900");
        expect(logged).not.toContain("pessoa@example.com");
        expect(body).not.toContain("pessoa@example.com");
        expect(body).not.toContain("Pessoa Real");
    });
});

describe("POST /webhooks/payments — nome do plano nos eventos de assinatura", () => {
    it("resolve o nome pelo preço da assinatura", async () => {
        constructEventMock.mockReturnValue(
            subscriptionEvent("customer.subscription.updated")
        );

        await POST(request());

        expect(ensurePlanLabelMock).toHaveBeenCalledWith(
            expect.anything(),
            "price_pro",
            null
        );
        expect(calls).toEqual([
            "applySubscriptionState",
            "ensurePlanLabel",
            "markProcessed",
        ]);
    });

    it("resolve o nome mesmo quando nenhum perfil corresponde", async () => {
        findByStripeCustomerIdMock.mockResolvedValue(null);
        constructEventMock.mockReturnValue(
            subscriptionEvent("customer.subscription.created")
        );

        await POST(request());

        expect(applySubscriptionStateMock).not.toHaveBeenCalled();
        expect(ensurePlanLabelMock).toHaveBeenCalledWith(
            expect.anything(),
            "price_pro",
            null
        );
    });

    it("não resolve nome de assinatura sem preço", async () => {
        constructEventMock.mockReturnValue(
            subscriptionEvent("customer.subscription.updated", {
                items: { data: [] },
            })
        );

        await POST(request());

        expect(ensurePlanLabelMock).not.toHaveBeenCalled();
    });
});

/**
 * Signed with the real Stripe helper, so the verification itself is exercised: the HMAC is
 * computed locally and no request leaves the process.
 */
describe("POST /webhooks/payments — assinatura real da Stripe", () => {
    const WEBHOOK_SECRET = "whsec_offline_qa";

    async function realStripe() {
        vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_offline_qa");
        vi.stubEnv("STRIPE_WEBHOOK_SECRET", WEBHOOK_SECRET);
        const actual =
            await vi.importActual<typeof import("@repo/payments")>(
                "@repo/payments"
            );
        const stripe = actual.getStripe();
        if (!stripe) {
            throw new Error("o cliente da Stripe não foi construído");
        }
        return stripe;
    }

    it("processa o evento com assinatura válida", async () => {
        const stripe = await realStripe();
        getStripeMock.mockReturnValue(stripe);
        getWebhookSecretMock.mockReturnValue(WEBHOOK_SECRET);
        const payload = JSON.stringify(
            subscriptionEvent("customer.subscription.updated")
        );
        withSignature(
            stripe.webhooks.generateTestHeaderString({
                payload,
                secret: WEBHOOK_SECRET,
            })
        );

        const response = await POST(request(payload));

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(applySubscriptionStateMock).toHaveBeenCalledWith(
            "profile-1",
            expect.objectContaining({ status: "active" }),
            "customer.subscription.updated"
        );
        expect(markProcessedMock).toHaveBeenCalledWith(
            expect.objectContaining({ id: "evt_sub" })
        );
    });

    it("recusa o corpo adulterado depois da assinatura", async () => {
        const stripe = await realStripe();
        getStripeMock.mockReturnValue(stripe);
        getWebhookSecretMock.mockReturnValue(WEBHOOK_SECRET);
        const payload = JSON.stringify(
            subscriptionEvent("customer.subscription.updated")
        );
        withSignature(
            stripe.webhooks.generateTestHeaderString({
                payload,
                secret: WEBHOOK_SECRET,
            })
        );

        const response = await POST(
            request(payload.replace('"active"', '"canceled"'))
        );

        expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
        expect(applySubscriptionStateMock).not.toHaveBeenCalled();
        expect(markProcessedMock).not.toHaveBeenCalled();
    });

    it("recusa a assinatura feita com outro segredo", async () => {
        const stripe = await realStripe();
        getStripeMock.mockReturnValue(stripe);
        getWebhookSecretMock.mockReturnValue(WEBHOOK_SECRET);
        const payload = JSON.stringify(
            subscriptionEvent("customer.subscription.updated")
        );
        withSignature(
            stripe.webhooks.generateTestHeaderString({
                payload,
                secret: "whsec_someone_else",
            })
        );

        const response = await POST(request(payload));

        expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
        expect(applySubscriptionStateMock).not.toHaveBeenCalled();
    });
});
