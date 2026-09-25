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

    const query = () => {
        const chain = {
            where: (...args: unknown[]) => {
                log.push({ op: "where", args });
                return chain;
            },
            orderBy: (...args: unknown[]) => {
                log.push({ op: "orderBy", args });
                return chain;
            },
            limit: (...args: unknown[]) => {
                log.push({ op: "limit", args });
                return chain;
            },
            select: (...args: unknown[]) => {
                log.push({ op: "select", args });
                return chain;
            },
            get: () => Promise.resolve(result),
        };
        return chain;
    };

    return {
        rows: store,
        createMock: create,
        queryLog: log,
        queryResult: result,
        fakeDb: {
            collection: (table: string) => {
                log.push({ op: "collection", args: [table] });
                return {
                    ...query(),
                    doc: (id: string) => ({
                        create: (data: Record<string, unknown>) =>
                            create(id, data),
                    }),
                };
            },
        },
    };
});

vi.mock("@/(shared)/infra/database", () => ({ default: fakeDb }));

const { paidInvoiceRepository } = await import(
    "@/(shared)/repositories/paid-invoice.repository"
);

const AMOUNT_PAID = 2900;
const OTHER_AMOUNT = 9999;
const PAID_AT = new Date("2026-09-10T12:00:00.000Z");

function record(overrides: Record<string, unknown> = {}) {
    return {
        invoiceId: "in_qa",
        customerId: "cus_qa",
        subscriptionId: "sub_qa",
        priceId: "price_pro",
        billingReason: "subscription_create",
        amountPaid: AMOUNT_PAID,
        currency: "brl",
        paidAt: PAID_AT,
        ...overrides,
    };
}

beforeEach(() => {
    rows.clear();
    createMock.mockClear();
    queryLog.length = 0;
    queryResult.docs = [];
});

describe("paidInvoiceRepository.recordOnce", () => {
    it("grava a fatura sob o próprio id, sem o cliente", async () => {
        await expect(paidInvoiceRepository.recordOnce(record())).resolves.toBe(
            "created"
        );

        const row = rows.get("in_qa") as Record<string, unknown>;
        expect(Object.keys(row).sort()).toEqual(
            [
                "amountPaid",
                "billingReason",
                "currency",
                "paidAt",
                "priceId",
                "recordedAt",
                "subscriptionId",
            ].sort()
        );
        expect(row.amountPaid).toBe(AMOUNT_PAID);
        expect(row.paidAt).toEqual(PAID_AT);
        expect(row).not.toHaveProperty("customerId");
        expect(row).not.toHaveProperty("profileId");
    });

    it("reconhece a mesma fatura gravada antes, sem regravar", async () => {
        await paidInvoiceRepository.recordOnce(record());

        await expect(
            paidInvoiceRepository.recordOnce(
                record({ amountPaid: OTHER_AMOUNT })
            )
        ).resolves.toBe("exists");
        expect((rows.get("in_qa") as { amountPaid: number }).amountPaid).toBe(
            AMOUNT_PAID
        );
    });

    it("deixa subir qualquer outra falha do Firestore", async () => {
        createMock.mockRejectedValueOnce(
            Object.assign(new Error("unavailable"), { code: 14 })
        );

        await expect(
            paidInvoiceRepository.recordOnce(record())
        ).rejects.toThrow("unavailable");
    });
});

describe("paidInvoiceRepository.listPaidBetween", () => {
    it("filtra paidAt em [início, fim) e lê só valor e moeda", async () => {
        const start = new Date("2026-09-01T00:00:00.000Z");
        const end = new Date("2026-10-01T00:00:00.000Z");
        queryResult.docs = [
            { id: "in_1", data: () => ({ amountPaid: 2900, currency: "brl" }) },
            { id: "in_2", data: () => ({ currency: "usd" }) },
        ];

        const result = await paidInvoiceRepository.listPaidBetween(start, end);

        expect(queryLog).toContainEqual({
            op: "collection",
            args: ["paidInvoice"],
        });
        expect(queryLog).toContainEqual({
            op: "where",
            args: ["paidAt", ">=", start],
        });
        expect(queryLog).toContainEqual({
            op: "where",
            args: ["paidAt", "<", end],
        });
        expect(queryLog).toContainEqual({
            op: "select",
            args: ["amountPaid", "currency"],
        });
        expect(result).toEqual([
            { amountPaid: 2900, currency: "brl" },
            { amountPaid: 0, currency: "usd" },
        ]);
    });
});

describe("paidInvoiceRepository.firstPaidAt", () => {
    it("ordena por paidAt crescente, lê um documento e devolve ISO", async () => {
        queryResult.docs = [
            {
                id: "in_1",
                data: () => ({ paidAt: Timestamp.fromDate(PAID_AT) }),
            },
        ];

        await expect(paidInvoiceRepository.firstPaidAt()).resolves.toBe(
            PAID_AT.toISOString()
        );
        expect(queryLog).toContainEqual({
            op: "orderBy",
            args: ["paidAt", "asc"],
        });
        expect(queryLog).toContainEqual({ op: "limit", args: [1] });
    });

    it("devolve null quando nenhuma fatura foi registrada", async () => {
        await expect(paidInvoiceRepository.firstPaidAt()).resolves.toBeNull();
    });
});
