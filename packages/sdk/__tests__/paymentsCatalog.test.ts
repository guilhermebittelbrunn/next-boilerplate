import { beforeEach, describe, expect, it, vi } from "vitest";
import PaymentsActions from "../src/actions/payments/action";
import type { Client } from "../src/client/index";

const requestMock = vi.fn();
const client = { request: requestMock } as unknown as Client;

beforeEach(() => {
    requestMock.mockReset();
});

describe("PaymentsActions.listCatalog", () => {
    it("lê o catálogo público com prazo, para a landing não esperar uma API travada", async () => {
        const catalog = { enabled: true, plans: [] };
        requestMock.mockResolvedValue({ data: { data: catalog } });

        const result = await new PaymentsActions(client).listCatalog();

        expect(result).toEqual(catalog);
        expect(requestMock).toHaveBeenCalledWith({
            url: "/payments/catalog",
            method: "GET",
            timeout: 5000,
        });
    });
});
