import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getStripeMock, constructEventMock, headersMock, envMock } = vi.hoisted(
    () => ({
        getStripeMock: vi.fn(),
        constructEventMock: vi.fn(),
        headersMock: vi.fn(),
        envMock: { STRIPE_WEBHOOK_SECRET: "whsec_qa" as string | undefined },
    })
);

vi.mock("@repo/payments", () => ({
    getStripe: () => getStripeMock(),
}));

vi.mock("next/headers", () => ({
    headers: () => headersMock(),
}));

vi.mock("@/env", () => ({
    env: envMock,
}));

const { POST } = await import("@/app/(routes)/webhooks/payments/route");

const SIGNED_BODY = '{"id":"evt_qa"}';

function request(body = SIGNED_BODY) {
    return new Request("http://localhost:3002/webhooks/payments", {
        method: "POST",
        body,
    });
}

function stripeClient() {
    return {
        webhooks: {
            constructEvent: (...args: unknown[]) => constructEventMock(...args),
        },
    };
}

function withSignature(signature: string | null) {
    headersMock.mockResolvedValue({ get: () => signature });
}

beforeEach(() => {
    vi.clearAllMocks();
    envMock.STRIPE_WEBHOOK_SECRET = "whsec_qa";
    getStripeMock.mockReturnValue(stripeClient());
    withSignature("t=1,v1=assinatura");
});

describe("POST /webhooks/payments — sem configuração", () => {
    it("responde Not configured quando não há cliente da Stripe", async () => {
        getStripeMock.mockReturnValue(null);

        const response = await POST(request());

        expect(response.status).toBe(HTTP_STATUS.OK);
        await expect(response.json()).resolves.toEqual({
            message: "Not configured",
            ok: false,
        });
        expect(constructEventMock).not.toHaveBeenCalled();
    });

    it("responde Not configured quando falta o segredo do webhook", async () => {
        envMock.STRIPE_WEBHOOK_SECRET = undefined;

        const response = await POST(request());

        await expect(response.json()).resolves.toEqual({
            message: "Not configured",
            ok: false,
        });
        expect(constructEventMock).not.toHaveBeenCalled();
    });

    it("não lê o corpo da requisição quando não está configurado", async () => {
        getStripeMock.mockReturnValue(null);

        const incoming = request();
        await POST(incoming);

        expect(incoming.bodyUsed).toBe(false);
    });
});

describe("POST /webhooks/payments — assinatura", () => {
    it("verifica o corpo cru contra a assinatura e o segredo configurado", async () => {
        constructEventMock.mockReturnValue({
            type: "checkout.session.completed",
            data: { object: { customer: "cus_1" } },
        });

        await POST(request());

        expect(constructEventMock).toHaveBeenCalledWith(
            SIGNED_BODY,
            "t=1,v1=assinatura",
            "whsec_qa"
        );
    });

    it("falha quando o header stripe-signature está ausente", async () => {
        withSignature(null);
        const error = vi.spyOn(console, "error").mockImplementation(() => {
            return;
        });

        const response = await POST(request());

        expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
        await expect(response.json()).resolves.toEqual({
            message: "something went wrong",
            ok: false,
        });
        expect(constructEventMock).not.toHaveBeenCalled();

        error.mockRestore();
    });

    it("falha quando a assinatura não confere", async () => {
        const error = vi.spyOn(console, "error").mockImplementation(() => {
            return;
        });
        constructEventMock.mockImplementation(() => {
            throw new Error("No signatures found matching the expected");
        });

        const response = await POST(request());

        expect(response.status).toBe(HTTP_STATUS.INTERNAL_SERVER_ERROR);
        await expect(response.json()).resolves.toEqual({
            message: "something went wrong",
            ok: false,
        });

        error.mockRestore();
    });

    it("não vaza a mensagem de erro da Stripe na resposta", async () => {
        const error = vi.spyOn(console, "error").mockImplementation(() => {
            return;
        });
        constructEventMock.mockImplementation(() => {
            throw new Error("whsec_qa is invalid");
        });

        const response = await POST(request());
        const body = JSON.stringify(await response.json());

        expect(body).not.toContain("whsec_qa");

        error.mockRestore();
    });
});

describe("POST /webhooks/payments — despacho de eventos", () => {
    it("aceita checkout.session.completed devolvendo o evento verificado", async () => {
        const event = {
            id: "evt_qa",
            type: "checkout.session.completed",
            data: { object: { customer: "cus_1" } },
        };
        constructEventMock.mockReturnValue(event);

        const response = await POST(request());

        expect(response.status).toBe(HTTP_STATUS.OK);
        await expect(response.json()).resolves.toEqual({
            result: event,
            ok: true,
        });
    });

    it("aceita subscription_schedule.canceled", async () => {
        constructEventMock.mockReturnValue({
            type: "subscription_schedule.canceled",
            data: { object: { customer: "cus_1" } },
        });

        const response = await POST(request());

        await expect(response.json()).resolves.toMatchObject({ ok: true });
    });

    it("aceita evento de assinatura sem customer sem quebrar", async () => {
        constructEventMock.mockReturnValue({
            type: "checkout.session.completed",
            data: { object: {} },
        });

        const response = await POST(request());

        expect(response.status).toBe(HTTP_STATUS.OK);
    });

    it("registra e aceita um tipo de evento não tratado", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {
            return;
        });
        constructEventMock.mockReturnValue({
            type: "invoice.paid",
            data: { object: {} },
        });

        const response = await POST(request());

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(warn).toHaveBeenCalledWith("Unhandled event type invoice.paid");

        warn.mockRestore();
    });
});
