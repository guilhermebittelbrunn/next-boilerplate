import type { Stripe } from "@repo/payments";
import type { SubscriptionState } from "@repo/sdk/src/types";
import { Timestamp } from "firebase-admin/firestore";
import { describe, expect, it } from "vitest";
import {
    decideSubscriptionWrite,
    isLiveSubscription,
    toPaidInvoiceRecord,
    toPlanDTO,
    toPlanLabel,
    toSubscriptionState,
} from "@/(shared)/lib/billing-state";

const PERIOD_END_SECONDS = 1_790_000_000;
const EVENT_SECONDS = 1_780_000_000;
const MS = 1000;
const LATER_SECONDS = 1_780_000_005;

function subscription(
    overrides: Partial<Stripe.Subscription> = {}
): Stripe.Subscription {
    return {
        id: "sub_qa",
        object: "subscription",
        status: "active",
        customer: "cus_qa",
        cancel_at_period_end: false,
        metadata: {},
        items: {
            object: "list",
            data: [
                {
                    id: "si_qa",
                    current_period_end: PERIOD_END_SECONDS,
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
    } as unknown as Stripe.Subscription;
}

function price(overrides: Record<string, unknown> = {}): Stripe.Price {
    return {
        id: "price_pro",
        object: "price",
        active: true,
        currency: "brl",
        unit_amount: 2900,
        recurring: { interval: "month", interval_count: 1 },
        product: {
            id: "prod_pro",
            object: "product",
            active: true,
            name: "Pro",
            description: "Para times pequenos",
            marketing_features: [
                { name: "5 membros" },
                { name: "Suporte por e-mail" },
                {},
            ],
        },
        ...overrides,
    } as unknown as Stripe.Price;
}

function state(overrides: Partial<SubscriptionState> = {}): SubscriptionState {
    return {
        subscriptionId: "sub_qa",
        status: "active",
        priceId: "price_pro",
        productId: "prod_pro",
        unitAmount: 2900,
        currency: "brl",
        interval: "month",
        intervalCount: 1,
        currentPeriodEnd: new Date(PERIOD_END_SECONDS * MS),
        cancelAtPeriodEnd: false,
        lastEventAt: new Date(EVENT_SECONDS * MS),
        ...overrides,
    };
}

/** The shape the document holds: Firestore hands dates back as `Timestamp`. */
function stored(overrides: Partial<SubscriptionState> = {}) {
    const value = state(overrides);
    return {
        ...value,
        lastEventAt: Timestamp.fromDate(value.lastEventAt),
        currentPeriodEnd: value.currentPeriodEnd
            ? Timestamp.fromDate(value.currentPeriodEnd)
            : null,
    };
}

const UPDATED = "customer.subscription.updated";
const CREATED = "customer.subscription.created";
const DELETED = "customer.subscription.deleted";

describe("isLiveSubscription", () => {
    it.each(["active", "trialing", "past_due", "unpaid", "paused"])(
        "%s conta como viva",
        (status) => {
            expect(isLiveSubscription({ status })).toBe(true);
        }
    );

    it.each(["incomplete", "incomplete_expired", "canceled"])(
        "%s não conta como viva",
        (status) => {
            expect(isLiveSubscription({ status })).toBe(false);
        }
    );

    it("perfil sem assinatura não tem assinatura viva", () => {
        expect(isLiveSubscription(undefined)).toBe(false);
        expect(isLiveSubscription(null)).toBe(false);
    });
});

describe("toSubscriptionState", () => {
    it("lê o fim do período do primeiro item da assinatura", () => {
        const result = toSubscriptionState(subscription(), EVENT_SECONDS);

        expect(result.currentPeriodEnd?.toISOString()).toBe(
            new Date(PERIOD_END_SECONDS * MS).toISOString()
        );
    });

    it("guarda o preço, a moeda e o intervalo no snapshot", () => {
        expect(toSubscriptionState(subscription(), EVENT_SECONDS)).toEqual(
            state()
        );
    });

    it("usa o instante do evento como lastEventAt", () => {
        const result = toSubscriptionState(subscription(), LATER_SECONDS);

        expect(result.lastEventAt.getTime()).toBe(LATER_SECONDS * MS);
    });

    it("grava null quando o payload não traz itens", () => {
        const result = toSubscriptionState(
            subscription({ items: { data: [] } as never }),
            EVENT_SECONDS
        );

        expect(result).toMatchObject({
            priceId: null,
            productId: null,
            unitAmount: null,
            currency: null,
            interval: null,
            intervalCount: null,
            currentPeriodEnd: null,
        });
    });

    it("aceita o produto expandido no preço", () => {
        const expanded = subscription();
        (
            expanded.items.data[0].price as unknown as { product: unknown }
        ).product = { id: "prod_expanded" };

        expect(toSubscriptionState(expanded, EVENT_SECONDS).productId).toBe(
            "prod_expanded"
        );
    });

    it("carrega o cancelamento agendado", () => {
        const result = toSubscriptionState(
            subscription({ cancel_at_period_end: true }),
            EVENT_SECONDS
        );

        expect(result.cancelAtPeriodEnd).toBe(true);
    });
});

describe("toPlanDTO", () => {
    it("mapeia nome, descrição, features e preço do produto expandido", () => {
        expect(toPlanDTO(price())).toEqual({
            priceId: "price_pro",
            productId: "prod_pro",
            name: "Pro",
            description: "Para times pequenos",
            features: ["5 membros", "Suporte por e-mail"],
            unitAmount: 2900,
            currency: "brl",
            interval: "month",
            intervalCount: 1,
        });
    });

    it("descarta produto arquivado", () => {
        const archived = price();
        (archived.product as { active: boolean }).active = false;

        expect(toPlanDTO(archived)).toBeNull();
    });

    it("descarta produto apagado", () => {
        expect(
            toPlanDTO(price({ product: { id: "prod_x", deleted: true } }))
        ).toBeNull();
    });

    it("descarta preço avulso", () => {
        expect(toPlanDTO(price({ recurring: null }))).toBeNull();
    });

    it("descarta preço inativo", () => {
        expect(toPlanDTO(price({ active: false }))).toBeNull();
    });

    it("descarta preço cujo produto não veio expandido", () => {
        expect(toPlanDTO(price({ product: "prod_pro" }))).toBeNull();
    });
});

describe("decideSubscriptionWrite", () => {
    it("aplica quando não há nada gravado", () => {
        expect(decideSubscriptionWrite(undefined, state(), CREATED)).toEqual({
            kind: "apply",
        });
        expect(decideSubscriptionWrite(null, state(), UPDATED)).toEqual({
            kind: "apply",
        });
    });

    it("aplica uma assinatura nova quando a gravada terminou", () => {
        const decision = decideSubscriptionWrite(
            stored({ subscriptionId: "sub_old", status: "canceled" }),
            state({ subscriptionId: "sub_new", status: "incomplete" }),
            CREATED
        );

        expect(decision).toEqual({ kind: "apply" });
    });

    it("não deixa o deleted atrasado de uma assinatura antiga derrubar a atual", () => {
        const decision = decideSubscriptionWrite(
            stored({ subscriptionId: "sub_current", status: "active" }),
            state({ subscriptionId: "sub_old", status: "canceled" }),
            DELETED
        );

        expect(decision).toEqual({
            kind: "skip",
            reason: "older-subscription-ended",
        });
    });

    it("troca de assinatura viva para outra viva", () => {
        const decision = decideSubscriptionWrite(
            stored({ subscriptionId: "sub_a", status: "active" }),
            state({ subscriptionId: "sub_b", status: "active" }),
            UPDATED
        );

        expect(decision).toEqual({ kind: "apply" });
    });

    it("não ressuscita uma assinatura cancelada", () => {
        const decision = decideSubscriptionWrite(
            stored({ status: "canceled" }),
            state({
                status: "active",
                lastEventAt: new Date((EVENT_SECONDS + 60) * MS),
            }),
            UPDATED
        );

        expect(decision).toEqual({ kind: "skip", reason: "terminal" });
    });

    it("trata incomplete_expired como terminal também", () => {
        const decision = decideSubscriptionWrite(
            stored({ status: "incomplete_expired" }),
            state({
                status: "active",
                lastEventAt: new Date((EVENT_SECONDS + 60) * MS),
            }),
            UPDATED
        );

        expect(decision).toEqual({ kind: "skip", reason: "terminal" });
    });

    it("ignora created da mesma assinatura já conhecida, mesmo no mesmo segundo", () => {
        const decision = decideSubscriptionWrite(
            stored({ status: "active" }),
            state({ status: "incomplete" }),
            CREATED
        );

        expect(decision).toEqual({
            kind: "skip",
            reason: "created-after-known",
        });
    });

    it("ignora evento mais antigo que o último aplicado", () => {
        const decision = decideSubscriptionWrite(
            stored({ status: "past_due" }),
            state({
                status: "active",
                lastEventAt: new Date((EVENT_SECONDS - 1) * MS),
            }),
            UPDATED
        );

        expect(decision).toEqual({ kind: "skip", reason: "stale" });
    });

    it("aplica evento do mesmo segundo, que chegou depois", () => {
        const decision = decideSubscriptionWrite(
            stored({ status: "active" }),
            state({ status: "past_due" }),
            UPDATED
        );

        expect(decision).toEqual({ kind: "apply" });
    });

    it("aplica evento mais novo da mesma assinatura", () => {
        const decision = decideSubscriptionWrite(
            stored({ status: "active" }),
            state({
                status: "canceled",
                lastEventAt: new Date((EVENT_SECONDS + 60) * MS),
            }),
            DELETED
        );

        expect(decision).toEqual({ kind: "apply" });
    });

    it("lê lastEventAt gravado como string ISO", () => {
        const decision = decideSubscriptionWrite(
            {
                ...state(),
                lastEventAt: new Date(EVENT_SECONDS * MS).toISOString(),
            },
            state({ lastEventAt: new Date((EVENT_SECONDS - 1) * MS) }),
            UPDATED
        );

        expect(decision).toEqual({ kind: "skip", reason: "stale" });
    });

    it("trata documento sem subscriptionId como nada gravado", () => {
        expect(
            decideSubscriptionWrite({ status: "active" }, state(), UPDATED)
        ).toEqual({ kind: "apply" });
    });
});

const PAID_AT_SECONDS = 1_780_000_100;

function invoice(overrides: Record<string, unknown> = {}): Stripe.Invoice {
    return {
        id: "in_qa",
        object: "invoice",
        amount_paid: 2900,
        currency: "brl",
        billing_reason: "subscription_create",
        customer: "cus_qa",
        customer_email: "pessoa@example.com",
        status_transitions: { paid_at: PAID_AT_SECONDS },
        parent: {
            type: "subscription_details",
            subscription_details: { subscription: "sub_parent", metadata: {} },
        },
        lines: {
            object: "list",
            data: [
                {
                    subscription: "sub_line",
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
    } as unknown as Stripe.Invoice;
}

describe("toPaidInvoiceRecord", () => {
    it("lê valor, moeda, motivo, assinatura, preço e o instante do pagamento", () => {
        expect(toPaidInvoiceRecord(invoice(), EVENT_SECONDS)).toEqual({
            invoiceId: "in_qa",
            customerId: "cus_qa",
            subscriptionId: "sub_parent",
            priceId: "price_pro",
            billingReason: "subscription_create",
            amountPaid: 2900,
            currency: "brl",
            paidAt: new Date(PAID_AT_SECONDS * MS),
        });
    });

    it("cai no instante do evento quando a fatura não traz paid_at", () => {
        const record = toPaidInvoiceRecord(
            invoice({ status_transitions: { paid_at: null } }),
            EVENT_SECONDS
        );

        expect(record.paidAt).toEqual(new Date(EVENT_SECONDS * MS));
    });

    it("usa a assinatura da primeira linha quando não há parent (versão de API anterior)", () => {
        const record = toPaidInvoiceRecord(
            invoice({ parent: null }),
            EVENT_SECONDS
        );

        expect(record.subscriptionId).toBe("sub_line");
    });

    it("aceita o customer expandido como objeto", () => {
        const record = toPaidInvoiceRecord(
            invoice({ customer: { id: "cus_obj", object: "customer" } }),
            EVENT_SECONDS
        );

        expect(record.customerId).toBe("cus_obj");
    });

    it("fatura avulsa, sem linhas nem assinatura, fica sem preço e sem assinatura", () => {
        const record = toPaidInvoiceRecord(
            invoice({
                parent: null,
                billing_reason: "manual",
                lines: { object: "list", data: [] },
            }),
            EVENT_SECONDS
        );

        expect(record.subscriptionId).toBeNull();
        expect(record.priceId).toBeNull();
        expect(record.billingReason).toBe("manual");
    });

    it("não carrega e-mail nem outro dado pessoal da fatura", () => {
        const record = toPaidInvoiceRecord(invoice(), EVENT_SECONDS);

        expect(JSON.stringify(record)).not.toContain("pessoa@example.com");
    });
});

describe("toPlanLabel", () => {
    it("usa o nome do produto expandido", () => {
        expect(toPlanLabel(price())).toEqual({
            name: "Pro",
            productId: "prod_pro",
            interval: "month",
            intervalCount: 1,
        });
    });

    it("mantém o nome de um produto arquivado, que ainda tem assinantes", () => {
        const archived = price({
            active: false,
            product: {
                id: "prod_old",
                object: "product",
                active: false,
                name: "Legado",
            },
        });

        expect(toPlanLabel(archived).name).toBe("Legado");
    });

    it("cai no nickname do preço quando o produto foi apagado", () => {
        const label = toPlanLabel(
            price({
                nickname: "Pro anual",
                product: { id: "prod_gone", object: "product", deleted: true },
            })
        );

        expect(label.name).toBe("Pro anual");
        expect(label.productId).toBe("prod_gone");
    });

    it("devolve nome nulo quando o produto não veio expandido e não há nickname", () => {
        const label = toPlanLabel(
            price({ nickname: null, product: "prod_pro" })
        );

        expect(label.name).toBeNull();
        expect(label.productId).toBe("prod_pro");
    });
});
