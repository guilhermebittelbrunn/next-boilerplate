import { beforeEach, describe, expect, it, vi } from "vitest";

const { keysMock } = vi.hoisted(() => ({
    keysMock: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("../keys", () => ({
    keys: () => keysMock(),
}));

const { getWebhookSecret, isPaymentsConfigured } = await import("../index");

function withKeys(secretKey?: string, webhookSecret?: string) {
    keysMock.mockReturnValue({
        STRIPE_SECRET_KEY: secretKey,
        STRIPE_WEBHOOK_SECRET: webhookSecret,
    });
}

beforeEach(() => {
    keysMock.mockReset();
});

describe("isPaymentsConfigured", () => {
    it("liga com as duas chaves", () => {
        withKeys("sk_test_offline_qa", "whsec_offline_qa");

        expect(isPaymentsConfigured()).toBe(true);
    });

    it("fica desligado só com a chave secreta", () => {
        withKeys("sk_test_offline_qa", undefined);

        expect(isPaymentsConfigured()).toBe(false);
    });

    it("fica desligado só com o segredo do webhook", () => {
        withKeys(undefined, "whsec_offline_qa");

        expect(isPaymentsConfigured()).toBe(false);
    });

    it("fica desligado sem nenhuma", () => {
        withKeys(undefined, undefined);

        expect(isPaymentsConfigured()).toBe(false);
    });

    it("trata string vazia como ausência", () => {
        withKeys("", "");

        expect(isPaymentsConfigured()).toBe(false);
    });
});

describe("getWebhookSecret", () => {
    it("devolve o segredo configurado", () => {
        withKeys("sk_test_offline_qa", "whsec_offline_qa");

        expect(getWebhookSecret()).toBe("whsec_offline_qa");
    });

    it("devolve null sem segredo", () => {
        withKeys("sk_test_offline_qa", undefined);

        expect(getWebhookSecret()).toBeNull();
    });
});
