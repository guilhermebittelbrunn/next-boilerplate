import { Timestamp } from "firebase-admin/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { fakeDb, store, getAllMock, setMock } = vi.hoisted(() => {
    const docs = new Map<string, Record<string, unknown>>();
    const snapshotOf = (id: string) => ({
        id,
        exists: docs.has(id),
        data: () => docs.get(id),
    });
    const getAll = vi.fn((...refs: { id: string }[]) =>
        Promise.resolve(refs.map((ref) => snapshotOf(ref.id)))
    );
    const set = vi.fn((id: string, data: Record<string, unknown>) => {
        docs.set(id, data);
        return Promise.resolve();
    });

    return {
        store: docs,
        getAllMock: getAll,
        setMock: set,
        fakeDb: {
            getAll,
            collection: () => ({
                doc: (id: string) => ({
                    id,
                    get: () => Promise.resolve(snapshotOf(id)),
                    set: (data: Record<string, unknown>) => set(id, data),
                }),
            }),
        },
    };
});

vi.mock("@/(shared)/infra/database", () => ({ default: fakeDb }));

const { planLabelRepository } = await import(
    "@/(shared)/repositories/plan-label.repository"
);

const RESOLVED_AT = new Date("2026-09-20T10:00:00.000Z");

const PRO = {
    name: "Pro",
    productId: "prod_pro",
    interval: "month",
    intervalCount: 1,
};

beforeEach(() => {
    store.clear();
    getAllMock.mockClear();
    setMock.mockClear();
});

describe("planLabelRepository.findByPriceIds", () => {
    it("não consulta o banco com a lista vazia", async () => {
        const labels = await planLabelRepository.findByPriceIds([]);

        expect(labels.size).toBe(0);
        expect(getAllMock).not.toHaveBeenCalled();
    });

    it("lê os ids pedidos de uma vez, sem repetir, e ignora os ausentes", async () => {
        store.set("price_pro", {
            ...PRO,
            resolvedAt: Timestamp.fromDate(RESOLVED_AT),
        });

        const labels = await planLabelRepository.findByPriceIds([
            "price_pro",
            "price_pro",
            "price_missing",
        ]);

        expect(getAllMock).toHaveBeenCalledTimes(1);
        expect(getAllMock.mock.calls[0]).toHaveLength(2);
        expect(labels.get("price_pro")).toEqual(PRO);
        expect(labels.has("price_missing")).toBe(false);
    });
});

describe("planLabelRepository.find", () => {
    it("devolve o nome com o instante da resolução em ISO", async () => {
        store.set("price_pro", {
            ...PRO,
            resolvedAt: Timestamp.fromDate(RESOLVED_AT),
        });

        await expect(planLabelRepository.find("price_pro")).resolves.toEqual({
            id: "price_pro",
            ...PRO,
            resolvedAt: RESOLVED_AT.toISOString(),
        });
    });

    it("devolve null para um preço nunca resolvido", async () => {
        await expect(planLabelRepository.find("price_x")).resolves.toBeNull();
    });
});

describe("planLabelRepository.save", () => {
    it("grava o nome sob o id do preço, carimbando a resolução", async () => {
        await planLabelRepository.save("price_pro", {
            name: "Pro",
            productId: "prod_pro",
            interval: "month",
            intervalCount: 1,
        });

        expect(setMock).toHaveBeenCalledWith(
            "price_pro",
            expect.objectContaining({ ...PRO, resolvedAt: expect.any(Date) })
        );
    });
});
