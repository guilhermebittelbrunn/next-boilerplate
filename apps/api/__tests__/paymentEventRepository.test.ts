import { beforeEach, describe, expect, it, vi } from "vitest";

const RETENTION_DAYS = 30;
const MS_PER_DAY = 86_400_000;
const RETENTION_MS = RETENTION_DAYS * MS_PER_DAY;

const { fakeDb, rows, createMock } = vi.hoisted(() => {
    const store = new Map<string, Record<string, unknown>>();
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
        fakeDb: {
            collection: (table: string) => ({
                doc: (id: string) => ({
                    get: () =>
                        Promise.resolve({
                            exists: table === "paymentEvent" && store.has(id),
                        }),
                    create: (data: Record<string, unknown>) => create(id, data),
                }),
            }),
        },
    };
});

vi.mock("@/(shared)/infra/database", () => ({ default: fakeDb }));

const { paymentEventRepository } = await import(
    "@/(shared)/repositories/payment-event.repository"
);

beforeEach(() => {
    rows.clear();
    createMock.mockClear();
});

describe("paymentEventRepository", () => {
    it("não conhece um evento que nunca foi marcado", async () => {
        await expect(
            paymentEventRepository.wasProcessed("evt_new")
        ).resolves.toBe(false);
    });

    it("grava o evento sob o próprio id, com o tipo e a validade para TTL", async () => {
        await paymentEventRepository.markProcessed({
            id: "evt_1",
            type: "customer.subscription.updated",
        });

        const row = rows.get("evt_1") as {
            type: string;
            createdAt: Date;
            expiresAt: Date;
        };
        expect(row.type).toBe("customer.subscription.updated");
        expect(row.expiresAt.getTime() - row.createdAt.getTime()).toBe(
            RETENTION_MS
        );
        await expect(
            paymentEventRepository.wasProcessed("evt_1")
        ).resolves.toBe(true);
    });

    it("engole a marcação concorrente do mesmo evento", async () => {
        await paymentEventRepository.markProcessed({ id: "evt_1", type: "x" });

        await expect(
            paymentEventRepository.markProcessed({ id: "evt_1", type: "x" })
        ).resolves.toBeUndefined();
    });

    it("deixa subir qualquer outra falha do Firestore", async () => {
        createMock.mockRejectedValueOnce(
            Object.assign(new Error("unavailable"), { code: 14 })
        );

        await expect(
            paymentEventRepository.markProcessed({ id: "evt_2", type: "x" })
        ).rejects.toThrow("unavailable");
    });
});
