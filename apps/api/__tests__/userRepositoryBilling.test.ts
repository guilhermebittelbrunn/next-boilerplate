import type { SubscriptionState } from "@repo/sdk/src/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    fakeDb,
    docs,
    updates,
    transactionUpdates,
    runTransactionMock,
    whereCalls,
    selectCalls,
    getUsersMock,
} = vi.hoisted(() => {
    const store = new Map<string, Record<string, unknown>>();
    const recordedWheres: { field: string; op: string; value: unknown }[] = [];
    const recordedSelects: string[][] = [];
    const plainUpdates: { id: string; data: Record<string, unknown> }[] = [];
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
        whereCalls: recordedWheres,
        selectCalls: recordedSelects,
        getUsersMock: vi.fn(),
        docs: store,
        updates: plainUpdates,
        transactionUpdates: txUpdates,
        runTransactionMock: runTransaction,
        fakeDb: {
            runTransaction,
            collection: () => ({
                doc: docRef,
                where: (field: string, op: string, value: unknown) => {
                    recordedWheres.push({ field, op, value });
                    const read = (row: Record<string, unknown>) =>
                        field
                            .split(".")
                            .reduce<unknown>(
                                (node, key) =>
                                    (node as Record<string, unknown>)?.[key],
                                row
                            );
                    const matches = (row: Record<string, unknown>) =>
                        op === "in"
                            ? (value as unknown[]).includes(read(row))
                            : read(row) === value;
                    const get = () =>
                        Promise.resolve({
                            docs: [...store.entries()]
                                .filter(([, row]) => matches(row))
                                .map(([id, row]) => ({
                                    id,
                                    data: () => row,
                                })),
                        });
                    return {
                        get,
                        select: (...fields: string[]) => {
                            recordedSelects.push(fields);
                            return { get };
                        },
                    };
                },
            }),
        },
    };
});

vi.mock("@/(shared)/infra/database", () => ({ default: fakeDb }));

vi.mock("@repo/auth/server", () => ({
    getAuthInstance: () => ({
        getUsers: (...args: unknown[]) => getUsersMock(...args),
    }),
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
    whereCalls.length = 0;
    selectCalls.length = 0;
    getUsersMock.mockReset();
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

function liveProfile(
    status: string,
    subscription: Record<string, unknown> = {},
    deletedAt: Date | null = null
) {
    return {
        deletedAt,
        subscription: {
            status,
            priceId: "price_pro",
            productId: "prod_pro",
            interval: "month",
            intervalCount: 1,
            ...subscription,
        },
    };
}

describe("userRepository.countLiveSubscriptionsByPrice", () => {
    it("consulta exatamente os status vivos e lê só os campos da contagem", async () => {
        await userRepository.countLiveSubscriptionsByPrice();

        expect(whereCalls).toEqual([
            {
                field: "subscription.status",
                op: "in",
                value: ["active", "trialing", "past_due", "unpaid", "paused"],
            },
        ]);
        expect(selectCalls[0]).toEqual([
            "subscription.priceId",
            "subscription.productId",
            "subscription.interval",
            "subscription.intervalCount",
            "deletedAt",
        ]);
    });

    it("agrupa por preço e deixa de fora o perfil apagado e a assinatura encerrada", async () => {
        docs.set("p1", liveProfile("active"));
        docs.set("p2", liveProfile("past_due"));
        docs.set("p3", liveProfile("trialing", { priceId: "price_basic" }));
        docs.set("p4", liveProfile("active", {}, new Date()));
        docs.set("p5", liveProfile("canceled"));
        docs.set("p6", { deletedAt: null });

        const counts = await userRepository.countLiveSubscriptionsByPrice();

        expect(counts).toHaveLength(2);
        expect(counts).toContainEqual({
            priceId: "price_pro",
            productId: "prod_pro",
            interval: "month",
            intervalCount: 1,
            count: 2,
        });
        expect(counts).toContainEqual(
            expect.objectContaining({ priceId: "price_basic", count: 1 })
        );
    });

    it("conta a assinatura sem preço num grupo próprio", async () => {
        docs.set("p1", liveProfile("active", { priceId: null }));

        const counts = await userRepository.countLiveSubscriptionsByPrice();

        expect(counts).toEqual([
            expect.objectContaining({ priceId: null, count: 1 }),
        ]);
    });
});

describe("userRepository.identifyByStripeCustomerIds", () => {
    it("não consulta nada com a lista vazia", async () => {
        const subscribers = await userRepository.identifyByStripeCustomerIds(
            []
        );

        expect(subscribers.size).toBe(0);
        expect(whereCalls).toHaveLength(0);
        expect(getUsersMock).not.toHaveBeenCalled();
    });

    it("resolve nome e e-mail pelo Auth numa chamada só", async () => {
        docs.set("p1", {
            stripeCustomerId: "cus_1",
            reference_id: "uid-1",
            deletedAt: null,
        });
        docs.set("p2", {
            stripeCustomerId: "cus_2",
            reference_id: "uid-2",
            deletedAt: null,
        });
        getUsersMock.mockResolvedValue({
            users: [
                { uid: "uid-1", displayName: "Ana", email: "ana@example.com" },
                { uid: "uid-2", email: "bia@example.com" },
            ],
            notFound: [],
        });

        const subscribers = await userRepository.identifyByStripeCustomerIds([
            "cus_1",
            "cus_2",
            "cus_1",
        ]);

        expect(whereCalls).toEqual([
            { field: "stripeCustomerId", op: "in", value: ["cus_1", "cus_2"] },
        ]);
        expect(getUsersMock).toHaveBeenCalledTimes(1);
        expect(getUsersMock).toHaveBeenCalledWith([
            { uid: "uid-1" },
            { uid: "uid-2" },
        ]);
        expect(subscribers.get("cus_1")).toEqual({
            profileId: "p1",
            displayName: "Ana",
            email: "ana@example.com",
        });
        expect(subscribers.get("cus_2")).toEqual({
            profileId: "p2",
            displayName: null,
            email: "bia@example.com",
        });
    });

    it("deixa de fora o perfil apagado e a conta que o Auth não conhece", async () => {
        docs.set("p1", {
            stripeCustomerId: "cus_deleted",
            reference_id: "uid-1",
            deletedAt: new Date(),
        });
        docs.set("p2", {
            stripeCustomerId: "cus_orphan",
            reference_id: "uid-2",
            deletedAt: null,
        });
        getUsersMock.mockResolvedValue({
            users: [],
            notFound: [{ uid: "uid-2" }],
        });

        const subscribers = await userRepository.identifyByStripeCustomerIds([
            "cus_deleted",
            "cus_orphan",
        ]);

        expect(subscribers.size).toBe(0);
        expect(getUsersMock).toHaveBeenCalledWith([{ uid: "uid-2" }]);
    });

    it("não chama o Auth quando nenhum perfil vivo corresponde", async () => {
        const subscribers = await userRepository.identifyByStripeCustomerIds([
            "cus_unknown",
        ]);

        expect(subscribers.size).toBe(0);
        expect(getUsersMock).not.toHaveBeenCalled();
    });

    it("deixa subir a falha transitória do Admin SDK", async () => {
        docs.set("p1", {
            stripeCustomerId: "cus_1",
            reference_id: "uid-1",
            deletedAt: null,
        });
        getUsersMock.mockRejectedValue(new Error("auth unavailable"));

        await expect(
            userRepository.identifyByStripeCustomerIds(["cus_1"])
        ).rejects.toThrow("auth unavailable");
    });
});
