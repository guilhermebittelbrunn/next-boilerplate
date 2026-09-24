import { beforeEach, describe, expect, it, vi } from "vitest";

const { keysMock, toolkitConstructorMock } = vi.hoisted(() => ({
    keysMock: vi.fn(),
    toolkitConstructorMock: vi.fn(),
}));

vi.mock("../keys", () => ({
    keys: () => keysMock(),
}));

vi.mock("@stripe/agent-toolkit/ai-sdk", () => ({
    StripeAgentToolkit: class {
        constructor(options: unknown) {
            toolkitConstructorMock(options);
        }
    },
}));

async function loadToolkitModule() {
    vi.resetModules();
    return await import("../ai");
}

beforeEach(() => {
    keysMock.mockReset();
    toolkitConstructorMock.mockReset();
});

describe("getPaymentsAgentToolkit", () => {
    it("não constrói nada ao importar o módulo", async () => {
        keysMock.mockReturnValue({ STRIPE_SECRET_KEY: undefined });

        await loadToolkitModule();

        expect(keysMock).not.toHaveBeenCalled();
        expect(toolkitConstructorMock).not.toHaveBeenCalled();
    });

    it("devolve null sem chave secreta", async () => {
        keysMock.mockReturnValue({ STRIPE_SECRET_KEY: undefined });
        const { getPaymentsAgentToolkit } = await loadToolkitModule();

        expect(getPaymentsAgentToolkit()).toBeNull();
        expect(toolkitConstructorMock).not.toHaveBeenCalled();
    });

    it("constrói o toolkit com a chave configurada", async () => {
        keysMock.mockReturnValue({ STRIPE_SECRET_KEY: "sk_test_offline_qa" });
        const { getPaymentsAgentToolkit } = await loadToolkitModule();

        expect(getPaymentsAgentToolkit()).not.toBeNull();
        expect(toolkitConstructorMock).toHaveBeenCalledWith(
            expect.objectContaining({ secretKey: "sk_test_offline_qa" })
        );
    });
});
