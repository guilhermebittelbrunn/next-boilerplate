import { UserRoleLevel } from "@repo/auth/types";
import { UserType } from "@repo/sdk/src/types";
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    type MockInstance,
    vi,
} from "vitest";

const {
    resolveApiActorMock,
    findByReferenceIdMock,
    linkStripeCustomerMock,
    getStripeMock,
    isPaymentsConfiguredMock,
    pricesRetrieveMock,
    customersCreateMock,
    checkoutCreateMock,
    envMock,
} = vi.hoisted(() => ({
    resolveApiActorMock: vi.fn(),
    findByReferenceIdMock: vi.fn(),
    linkStripeCustomerMock: vi.fn(),
    getStripeMock: vi.fn(),
    isPaymentsConfiguredMock: vi.fn(),
    pricesRetrieveMock: vi.fn(),
    customersCreateMock: vi.fn(),
    checkoutCreateMock: vi.fn(),
    envMock: {
        NEXT_PUBLIC_APP_URL: "http://localhost:3000/" as string | undefined,
    },
}));

vi.mock("@/(shared)/lib/audit-recorder", () => ({
    recordAuditEvent: vi.fn(),
    recordImpersonationSession: vi.fn(),
}));

vi.mock("@/(shared)/lib/resolve-api-actor", () => ({
    resolveApiActor: (...args: unknown[]) => resolveApiActorMock(...args),
}));

vi.mock("@/(shared)/repositories/user.repository", () => ({
    userRepository: {
        findByReferenceId: (...args: unknown[]) =>
            findByReferenceIdMock(...args),
        linkStripeCustomer: (...args: unknown[]) =>
            linkStripeCustomerMock(...args),
        touchLastAccess: vi.fn(),
    },
}));

vi.mock("@repo/payments", () => ({
    getStripe: () => getStripeMock(),
    isPaymentsConfigured: () => isPaymentsConfiguredMock(),
}));

vi.mock("@/env", () => ({ env: envMock }));

const { POST } = await import("@/app/(routes)/payments/checkout/route");

const OWNER_UID = "common-9";
const OWNER_EMAIL = "qa-billing@example.com";
const ADMIN_UID = "admin-1";
const OWNER_PROFILE = {
    id: "profile-1",
    reference_id: OWNER_UID,
    type: UserType.COMMON,
};
const ADMIN_PROFILE = {
    id: "admin-profile",
    reference_id: ADMIN_UID,
    type: UserType.ADMIN,
};
const CHECKOUT_URL = "https://checkout.stripe.com/c/pay/cs_test_qa";
const VALID_BODY = { priceId: "price_pro", locale: "en" };

const OWNER_HEADERS = {
    [AUTH_REQUEST_HEADER.USER_ID]: OWNER_UID,
    [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.COMMON,
    [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
    [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: OWNER_UID,
};

const IMPERSONATION_HEADERS = {
    [AUTH_REQUEST_HEADER.USER_ID]: ADMIN_UID,
    [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.ADMIN,
    [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
    [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: OWNER_UID,
};

function request(body: unknown = VALID_BODY, headers = OWNER_HEADERS) {
    return new Request("http://localhost:3002/payments/checkout", {
        method: "POST",
        headers,
        body: typeof body === "string" ? body : JSON.stringify(body),
    }) as unknown as NextRequest;
}

function sellablePrice(overrides: Record<string, unknown> = {}) {
    return {
        id: "price_pro",
        active: true,
        currency: "brl",
        unit_amount: 2900,
        recurring: { interval: "month", interval_count: 1 },
        product: { id: "prod_pro", active: true, name: "Pro" },
        ...overrides,
    };
}

function withProfile(overrides: Record<string, unknown>) {
    findByReferenceIdMock.mockImplementation((uid: string) =>
        Promise.resolve(
            uid === ADMIN_UID
                ? ADMIN_PROFILE
                : { ...OWNER_PROFILE, ...overrides }
        )
    );
}

async function codeOf(response: Response): Promise<string> {
    const body = (await response.json()) as { error: { code: string } };
    return body.error.code;
}

let warn: MockInstance<typeof console.warn>;

beforeEach(() => {
    for (const mock of [
        resolveApiActorMock,
        findByReferenceIdMock,
        linkStripeCustomerMock,
        getStripeMock,
        isPaymentsConfiguredMock,
        pricesRetrieveMock,
        customersCreateMock,
        checkoutCreateMock,
    ]) {
        mock.mockReset();
    }
    envMock.NEXT_PUBLIC_APP_URL = "http://localhost:3000/";
    resolveApiActorMock.mockResolvedValue({
        uid: OWNER_UID,
        email: OWNER_EMAIL,
    });
    withProfile({});
    getStripeMock.mockReturnValue({
        prices: { retrieve: pricesRetrieveMock },
        customers: { create: customersCreateMock },
        checkout: { sessions: { create: checkoutCreateMock } },
    });
    isPaymentsConfiguredMock.mockReturnValue(true);
    pricesRetrieveMock.mockResolvedValue(sellablePrice());
    customersCreateMock.mockResolvedValue({ id: "cus_new" });
    linkStripeCustomerMock.mockResolvedValue(undefined);
    checkoutCreateMock.mockResolvedValue({ url: CHECKOUT_URL });
    warn = vi.spyOn(console, "warn").mockImplementation(() => {
        return;
    });
});

afterEach(() => {
    vi.unstubAllEnvs();
    warn.mockRestore();
});

describe("POST /payments/checkout — cobrança desligada", () => {
    it("responde 503 PAYMENTS_NOT_CONFIGURED sem chave da Stripe", async () => {
        getStripeMock.mockReturnValue(null);
        isPaymentsConfiguredMock.mockReturnValue(false);

        const response = await POST(request());

        expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
        expect(await codeOf(response)).toBe("PAYMENTS_NOT_CONFIGURED");
    });

    it("responde 503 no modo simple, mesmo com as chaves", async () => {
        vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "simple");

        const response = await POST(request());

        expect(await codeOf(response)).toBe("PAYMENTS_NOT_CONFIGURED");
        expect(pricesRetrieveMock).not.toHaveBeenCalled();
    });

    it("responde 503 sem a URL do app para o retorno", async () => {
        envMock.NEXT_PUBLIC_APP_URL = undefined;

        const response = await POST(request());

        expect(await codeOf(response)).toBe("PAYMENTS_NOT_CONFIGURED");
    });
});

describe("POST /payments/checkout — validação", () => {
    it.each([
        ["priceId ausente", {}],
        ["priceId fora do formato", { priceId: "prod_pro" }],
        ["locale fora da lista", { priceId: "price_pro", locale: "fr" }],
    ])("recusa %s com VALIDATION_FAILED", async (_label, body) => {
        const response = await POST(request(body));

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await codeOf(response)).toBe("VALIDATION_FAILED");
    });

    it("recusa JSON inválido com VALIDATION_FAILED", async () => {
        const response = await POST(request("{not json"));

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await codeOf(response)).toBe("VALIDATION_FAILED");
    });

    it("responde 404 quando a Stripe não tem o preço", async () => {
        pricesRetrieveMock.mockRejectedValue(
            Object.assign(new Error("No such price"), {
                code: "resource_missing",
            })
        );

        const response = await POST(request());

        expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
        expect(await codeOf(response)).toBe("PAYMENTS_PLAN_NOT_FOUND");
    });

    it.each([
        ["inativo", { active: false }],
        ["avulso", { recurring: null }],
        [
            "de produto arquivado",
            { product: { id: "prod_pro", active: false, name: "Pro" } },
        ],
    ])("responde 404 para preço %s", async (_label, overrides) => {
        pricesRetrieveMock.mockResolvedValue(sellablePrice(overrides));

        const response = await POST(request());

        expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
        expect(await codeOf(response)).toBe("PAYMENTS_PLAN_NOT_FOUND");
        expect(checkoutCreateMock).not.toHaveBeenCalled();
    });

    it.each(["active", "trialing", "past_due", "unpaid", "paused"])(
        "responde 409 com assinatura %s, sem ir à Stripe",
        async (status) => {
            withProfile({
                stripeCustomerId: "cus_existing",
                subscription: { subscriptionId: "sub_1", status },
            });

            const response = await POST(request());

            expect(response.status).toBe(HTTP_STATUS.CONFLICT);
            expect(await codeOf(response)).toBe(
                "PAYMENTS_SUBSCRIPTION_ALREADY_ACTIVE"
            );
            expect(pricesRetrieveMock).not.toHaveBeenCalled();
        }
    );

    it("deixa assinar de novo depois de uma assinatura cancelada", async () => {
        withProfile({
            stripeCustomerId: "cus_existing",
            subscription: { subscriptionId: "sub_1", status: "canceled" },
        });

        const response = await POST(request());

        expect(response.status).toBe(HTTP_STATUS.OK);
    });
});

describe("POST /payments/checkout — sessão", () => {
    it("devolve a URL do Checkout", async () => {
        const response = await POST(request());
        const body = (await response.json()) as { data: { url: string } };

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(body.data.url).toBe(CHECKOUT_URL);
    });

    it("reusa o cliente Stripe já ligado ao perfil", async () => {
        withProfile({ stripeCustomerId: "cus_existing" });

        await POST(request());

        expect(customersCreateMock).not.toHaveBeenCalled();
        expect(linkStripeCustomerMock).not.toHaveBeenCalled();
        expect(checkoutCreateMock).toHaveBeenCalledWith(
            expect.objectContaining({ customer: "cus_existing" })
        );
    });

    it("cria o cliente com chave de idempotência por perfil e grava o vínculo", async () => {
        await POST(request());

        expect(customersCreateMock).toHaveBeenCalledWith(
            { email: OWNER_EMAIL, metadata: { profileId: "profile-1" } },
            { idempotencyKey: "customer-profile-1" }
        );
        expect(linkStripeCustomerMock).toHaveBeenCalledWith(
            "profile-1",
            "cus_new"
        );
    });

    it("amarra a sessão ao perfil e volta para a aba billing no idioma da tela", async () => {
        await POST(request());

        expect(checkoutCreateMock).toHaveBeenCalledWith({
            mode: "subscription",
            customer: "cus_new",
            line_items: [{ price: "price_pro", quantity: 1 }],
            client_reference_id: "profile-1",
            metadata: { profileId: "profile-1" },
            subscription_data: { metadata: { profileId: "profile-1" } },
            success_url:
                "http://localhost:3000/en/account?tab=billing&checkout=success",
            cancel_url:
                "http://localhost:3000/en/account?tab=billing&checkout=canceled",
            locale: "en",
        });
    });

    it("traduz pt-br para o locale da Stripe", async () => {
        await POST(request({ priceId: "price_pro", locale: "pt-br" }));

        expect(checkoutCreateMock).toHaveBeenCalledWith(
            expect.objectContaining({
                locale: "pt-BR",
                success_url:
                    "http://localhost:3000/pt-br/account?tab=billing&checkout=success",
            })
        );
    });

    it("usa o idioma padrão quando o corpo não traz locale", async () => {
        await POST(request({ priceId: "price_pro" }));

        expect(checkoutCreateMock).toHaveBeenCalledWith(
            expect.objectContaining({ locale: "pt-BR" })
        );
    });

    it("não confia no priceId do corpo: usa o id que a Stripe devolveu", async () => {
        pricesRetrieveMock.mockResolvedValue(
            sellablePrice({ id: "price_canonical" })
        );

        await POST(request({ priceId: " price_pro " }));

        expect(pricesRetrieveMock).toHaveBeenCalledWith("price_pro", {
            expand: ["product"],
        });
        expect(checkoutCreateMock).toHaveBeenCalledWith(
            expect.objectContaining({
                line_items: [{ price: "price_canonical", quantity: 1 }],
            })
        );
    });

    it.each([
        ["na criação da sessão", () => checkoutCreateMock],
        ["na criação do cliente", () => customersCreateMock],
        ["na leitura do preço", () => pricesRetrieveMock],
    ])(
        "responde 503 PAYMENTS_PROVIDER_UNAVAILABLE quando a Stripe falha %s",
        async (_label, target) => {
            target().mockRejectedValue(new Error("Invalid API Key provided"));

            const response = await POST(request());

            expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
            expect(await codeOf(response)).toBe(
                "PAYMENTS_PROVIDER_UNAVAILABLE"
            );
        }
    );

    it("responde 503 quando a Stripe devolve sessão sem URL", async () => {
        checkoutCreateMock.mockResolvedValue({ url: null });

        const response = await POST(request());

        expect(await codeOf(response)).toBe("PAYMENTS_PROVIDER_UNAVAILABLE");
    });
});

describe("POST /payments/checkout — acesso", () => {
    it("recusa escrita durante personificação, antes de ir à Stripe", async () => {
        resolveApiActorMock.mockResolvedValue({
            uid: ADMIN_UID,
            email: "admin@example.com",
        });

        const response = await POST(request(VALID_BODY, IMPERSONATION_HEADERS));

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await codeOf(response)).toBe(
            "AUTH_REQUEST_IMPERSONATION_READ_ONLY"
        );
        expect(customersCreateMock).not.toHaveBeenCalled();
        expect(checkoutCreateMock).not.toHaveBeenCalled();
    });

    it("recusa quem não apresenta credencial", async () => {
        resolveApiActorMock.mockResolvedValue(null);

        const response = await POST(request());

        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
    });

    it("recusa o admin fora de personificação", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: ADMIN_UID });

        const response = await POST(
            request(VALID_BODY, {
                [AUTH_REQUEST_HEADER.USER_ID]: ADMIN_UID,
                [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.ADMIN,
                [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.ADMIN,
                [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: ADMIN_UID,
            })
        );

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
    });
});
