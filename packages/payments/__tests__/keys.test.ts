import { afterEach, describe, expect, it, vi } from "vitest";
import { keys } from "../keys";

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("keys", () => {
    it("lê string vazia como ausência, sem derrubar o boot", () => {
        vi.stubEnv("STRIPE_SECRET_KEY", "");
        vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");

        const resolved = keys();

        expect(resolved.STRIPE_SECRET_KEY).toBeUndefined();
        expect(resolved.STRIPE_WEBHOOK_SECRET).toBeUndefined();
    });

    it("aceita as duas chaves no formato da Stripe", () => {
        vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_offline_qa");
        vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_offline_qa");

        const resolved = keys();

        expect(resolved.STRIPE_SECRET_KEY).toBe("sk_test_offline_qa");
        expect(resolved.STRIPE_WEBHOOK_SECRET).toBe("whsec_offline_qa");
    });

    it("derruba a leitura quando a chave secreta tem o prefixo errado", () => {
        const error = vi.spyOn(console, "error").mockImplementation(() => {
            return;
        });
        vi.stubEnv("STRIPE_SECRET_KEY", "pk_test_publishable_by_mistake");
        vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");

        expect(() => keys()).toThrow();

        error.mockRestore();
    });

    it("derruba a leitura quando o segredo do webhook tem o prefixo errado", () => {
        const error = vi.spyOn(console, "error").mockImplementation(() => {
            return;
        });
        vi.stubEnv("STRIPE_SECRET_KEY", "");
        vi.stubEnv("STRIPE_WEBHOOK_SECRET", "sk_test_in_the_wrong_slot");

        expect(() => keys()).toThrow();

        error.mockRestore();
    });
});
