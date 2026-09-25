import { Timestamp } from "firebase-admin/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fakeDb, rows, createMock, queryLog, queryResult } = vi.hoisted(() => {
    const store = new Map<string, Record<string, unknown>>();
    const log: { op: string; args: unknown[] }[] = [];
    const result: { docs: { id: string; data: () => unknown }[] } = {
        docs: [],
    };
    // gRPC ALREADY_EXISTS, the status Firestore answers when `create()` hits a taken id.
    const alreadyExists = 6;
    const create = vi.fn((id: string, data: Record<string, unknown>) => {
        if (store.has(id)) {
            return Promise.reject(
                Object.assign(new Error("exists"), { code: alreadyExists })
            );
        }
        store.set(id, data);
        return Promise.resolve();
    });

    return {
        rows: store,
        createMock: create,
        queryLog: log,
        queryResult: result,
        fakeDb: {
            collection: (table: string) => {
                log.push({ op: "collection", args: [table] });
                const chain = {
                    orderBy: (...args: unknown[]) => {
                        log.push({ op: "orderBy", args });
                        return chain;
                    },
                    limit: (...args: unknown[]) => {
                        log.push({ op: "limit", args });
                        return chain;
                    },
                    get: () => Promise.resolve(result),
                    doc: (id: string) => ({
                        create: (data: Record<string, unknown>) =>
                            create(id, data),
                    }),
                };
                return chain;
            },
        },
    };
});

vi.mock("@/(shared)/infra/database", () => ({ default: fakeDb }));

const { subscriptionActivationRepository } = await import(
    "@/(shared)/repositories/subscription-activation.repository"
);

const ACTIVATED_AT = new Date("2026-09-20T10:00:00.000Z");

const input = {
    subscriptionId: "sub_qa",
    customerId: "cus_qa",
    priceId: "price_pro",
    activatedAt: ACTIVATED_AT,
};

const RECENT_LIMIT = 5;

beforeEach(() => {
    rows.clear();
    createMock.mockClear();
    queryLog.length = 0;
    queryResult.docs = [];
});

describe("subscriptionActivationRepository.recordOnce", () => {
    it("grava a ativação sob o id da assinatura", async () => {
        await expect(
            subscriptionActivationRepository.recordOnce(input)
        ).resolves.toBe("created");

        expect(rows.get("sub_qa")).toMatchObject({
            customerId: "cus_qa",
            priceId: "price_pro",
            activatedAt: ACTIVATED_AT,
        });
        expect(queryLog).toContainEqual({
            op: "collection",
            args: ["subscriptionActivation"],
        });
    });

    it("não regrava a ativação da mesma assinatura", async () => {
        await subscriptionActivationRepository.recordOnce(input);

        await expect(
            subscriptionActivationRepository.recordOnce({
                ...input,
                activatedAt: new Date(),
            })
        ).resolves.toBe("exists");
        expect(rows.get("sub_qa")?.activatedAt).toEqual(ACTIVATED_AT);
    });

    it("deixa subir qualquer outra falha do Firestore", async () => {
        createMock.mockRejectedValueOnce(
            Object.assign(new Error("unavailable"), { code: 14 })
        );

        await expect(
            subscriptionActivationRepository.recordOnce(input)
        ).rejects.toThrow("unavailable");
    });
});

describe("subscriptionActivationRepository.listRecent", () => {
    it("lê as mais recentes primeiro, com o limite pedido, e devolve ISO", async () => {
        queryResult.docs = [
            {
                id: "sub_qa",
                data: () => ({
                    customerId: "cus_qa",
                    priceId: null,
                    activatedAt: Timestamp.fromDate(ACTIVATED_AT),
                    recordedAt: Timestamp.fromDate(ACTIVATED_AT),
                }),
            },
        ];

        const result =
            await subscriptionActivationRepository.listRecent(RECENT_LIMIT);

        expect(queryLog).toContainEqual({
            op: "orderBy",
            args: ["activatedAt", "desc"],
        });
        expect(queryLog).toContainEqual({ op: "limit", args: [RECENT_LIMIT] });
        expect(result).toEqual([
            {
                id: "sub_qa",
                customerId: "cus_qa",
                priceId: null,
                activatedAt: ACTIVATED_AT.toISOString(),
            },
        ]);
    });
});
