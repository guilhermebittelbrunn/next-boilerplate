import type { SubscriptionState } from "@repo/sdk/src/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fakeDb, docs, updates, transactionUpdates, runTransactionMock } =
    vi.hoisted(() => {
        const store = new Map<string, Record<string, unknown>>();
        const plainUpdates: { id: string; data: Record<string, unknown> }[] =
            [];
        const txUpdates: { id: string; data: Record<string, unknown> }[] = [];

        const docRef = (id: string) => ({
            id,
            update: (data: Record<string, unknown>) => {
                plainUpdates.push({ id, data });
                return Promise.resolve();
            },
        });

        const runTransaction = vi.fn(
            (
                work: (transaction: {
                    get: (ref: { id: string }) => Promise<unknown>;
                    update: (
                        ref: { id: string },
                        data: Record<string, unknown>
                    ) => void;
                }) => Promise<unknown>
            ) =>
                work({
                    get: (ref) =>
                        Promise.resolve({
                            exists: store.has(ref.id),
                            data: () => store.get(ref.id),
                        }),
                    update: (ref, data) => {
                        txUpdates.push({ id: ref.id, data });
                    },
                })
        );

        return {
            docs: store,
            updates: plainUpdates,
            transactionUpdates: txUpdates,
            runTransactionMock: runTransaction,
            fakeDb: {
                runTransaction,
                collection: () => ({
                    doc: docRef,
                    where: (field: string, _op: string, value: unknown) => ({
                        get: () =>
                            Promise.resolve({
                                docs: [...store.entries()]
                                    .filter(([, row]) => row[field] === value)
                                    .map(([id, row]) => ({
                                        id,
                                        data: () => row,
                                    })),
                            }),
                    }),
                }),
            },
        };
    });

vi.mock("@/(shared)/infra/database", () => ({ default: fakeDb }));

vi.mock("@repo/auth/server", () => ({
    getAuthInstance: vi.fn(),
}));

const { userRepository } = await import(
    "@/(shared)/repositories/user.repository"
);

const EVENT_MS = 1_780_000_000_000;
const ONE_SECOND_MS = 1000;

function snapshot(
    overrides: Partial<SubscriptionState> = {}
): SubscriptionState {
    return {
        subscriptionId: "sub_qa",
        status: "active",
        priceId: "price_pro",
        productId: "prod_pro",
        unitAmount: 2900,
        currency: "brl",
        interval: "month",
        intervalCount: 1,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        lastEventAt: new Date(EVENT_MS),
        ...overrides,
    };
}

beforeEach(() => {
    docs.clear();
    updates.length = 0;
    transactionUpdates.length = 0;
    runTransactionMock.mockClear();
});

describe("userRepository.findByStripeCustomerId", () => {
    it("acha o perfil ligado ao cliente", async () => {
        docs.set("profile-1", { stripeCustomerId: "cus_qa", deletedAt: null });

        const profile = await userRepository.findByStripeCustomerId("cus_qa");

        expect(profile?.id).toBe("profile-1");
    });

    it("ignora o perfil apagado pelo admin", async () => {
        docs.set("profile-old", {
            stripeCustomerId: "cus_qa",
            deletedAt: new Date(),
        });
        docs.set("profile-new", {
            stripeCustomerId: "cus_qa",
            deletedAt: null,
        });

        const profile = await userRepository.findByStripeCustomerId("cus_qa");

        expect(profile?.id).toBe("profile-new");
    });

    it("devolve null quando nenhum perfil corresponde", async () => {
        await expect(
            userRepository.findByStripeCustomerId("cus_unknown")
        ).resolves.toBeNull();
    });
});

describe("userRepository.linkStripeCustomer", () => {
    it("grava só o vínculo", async () => {
        await userRepository.linkStripeCustomer("profile-1", "cus_qa");

        expect(updates).toHaveLength(1);
        expect(updates[0]?.id).toBe("profile-1");
        expect(updates[0]?.data.stripeCustomerId).toBe("cus_qa");
    });
});

describe("userRepository.applySubscriptionState", () => {
    it("grava o snapshot dentro da transação quando não há nada gravado", async () => {
        docs.set("profile-1", {});

        const result = await userRepository.applySubscriptionState(
            "profile-1",
            snapshot(),
            "customer.subscription.created"
        );

        expect(result).toBe("applied");
        expect(runTransactionMock).toHaveBeenCalledTimes(1);
        expect(transactionUpdates[0]?.data.subscription).toEqual(snapshot());
        expect(updates).toHaveLength(0);
    });

    it("não grava quando a regra de ordem descarta o evento", async () => {
        docs.set("profile-1", { subscription: snapshot() });

        const result = await userRepository.applySubscriptionState(
            "profile-1",
            snapshot({ lastEventAt: new Date(EVENT_MS - ONE_SECOND_MS) }),
            "customer.subscription.updated"
        );

        expect(result).toBe("skipped");
        expect(transactionUpdates).toHaveLength(0);
    });

    it("não grava sobre uma assinatura cancelada", async () => {
        docs.set("profile-1", {
            subscription: snapshot({ status: "canceled" }),
        });

        const result = await userRepository.applySubscriptionState(
            "profile-1",
            snapshot({ lastEventAt: new Date(EVENT_MS + ONE_SECOND_MS) }),
            "customer.subscription.updated"
        );

        expect(result).toBe("skipped");
    });

    it("responde missing quando o perfil sumiu", async () => {
        const result = await userRepository.applySubscriptionState(
            "gone",
            snapshot(),
            "customer.subscription.updated"
        );

        expect(result).toBe("missing");
        expect(transactionUpdates).toHaveLength(0);
    });
});
