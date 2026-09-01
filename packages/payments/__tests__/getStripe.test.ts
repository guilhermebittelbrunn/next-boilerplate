import Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { keysMock } = vi.hoisted(() => ({
    keysMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("../keys", () => ({
    keys: () => keysMock(),
}));

type StripeApiFields = { getApiField: (name: string) => string };

async function loadPayments(secretKey?: string) {
    keysMock.mockReturnValue({ STRIPE_SECRET_KEY: secretKey });
    vi.resetModules();
    return await import("../index");
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe("getStripe", () => {
    it("devolve null quando a chave secreta não está configurada", async () => {
        const { getStripe } = await loadPayments(undefined);

        expect(getStripe()).toBeNull();
    });

    it("devolve null quando a chave secreta está vazia", async () => {
        const { getStripe } = await loadPayments("");

        expect(getStripe()).toBeNull();
    });

    it("não constrói o cliente no carregamento do módulo", async () => {
        keysMock.mockReturnValue({ STRIPE_SECRET_KEY: "" });
        vi.resetModules();

        await expect(import("../index")).resolves.toBeDefined();
        expect(keysMock).not.toHaveBeenCalled();
    });

    it("devolve um cliente da Stripe quando há chave", async () => {
        const { getStripe } = await loadPayments("sk_test_qa_pipeline");

        expect(getStripe()).toBeInstanceOf(Stripe);
    });

    it("constrói o cliente com a versão de API fixada pelo pacote", async () => {
        const { getStripe } = await loadPayments("sk_test_qa_pipeline");
        const client = getStripe() as unknown as StripeApiFields;

        expect(client.getApiField("version")).toBe("2025-09-30.clover");
    });

    it("devolve a mesma instância em chamadas repetidas", async () => {
        const { getStripe } = await loadPayments("sk_test_qa_pipeline");

        expect(getStripe()).toBe(getStripe());
    });

    it("relê a chave a cada chamada em vez de fixá-la no carregamento", async () => {
        const { getStripe } = await loadPayments("sk_test_qa_pipeline");

        getStripe();
        getStripe();

        expect(keysMock).toHaveBeenCalledTimes(2);
    });

    it("constrói o cliente sob demanda, não antes da primeira chamada", async () => {
        const { getStripe } = await loadPayments("sk_test_qa_pipeline");

        expect(keysMock).not.toHaveBeenCalled();

        getStripe();

        expect(keysMock).toHaveBeenCalledTimes(1);
    });
});
