import { UserRoleLevel } from "@repo/auth/types";
import { UserType } from "@repo/sdk/src/types";
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
    resolveApiActorMock,
    findByReferenceIdMock,
    getStripeMock,
    isPaymentsConfiguredMock,
    pricesListMock,
    envMock,
} = vi.hoisted(() => ({
    resolveApiActorMock: vi.fn(),
    findByReferenceIdMock: vi.fn(),
    getStripeMock: vi.fn(),
    isPaymentsConfiguredMock: vi.fn(),
    pricesListMock: vi.fn(),
    envMock: {
        NEXT_PUBLIC_APP_URL: "http://localhost:3000" as string | undefined,
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
        touchLastAccess: vi.fn(),
    },
}));

vi.mock("@repo/payments", () => ({
    getStripe: () => getStripeMock(),
    isPaymentsConfigured: () => isPaymentsConfiguredMock(),
}));

vi.mock("@/env", () => ({ env: envMock }));

const { GET } = await import("@/app/(routes)/payments/plans/route");

const OWNER_UID = "common-9";
const PRO_AMOUNT = 2900;
const BUSINESS_AMOUNT = 9900;
const ARCHIVED_AMOUNT = 100;
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

function recurringPrice(id: string, unitAmount: number | null, active = true) {
    return {
        id,
        active: true,
        currency: "brl",
        unit_amount: unitAmount,
        recurring: { interval: "month", interval_count: 1 },
        product: {
            id: `prod_${id}`,
            active,
            name: `Plano ${id}`,
            description: null,
            marketing_features: [],
        },
    };
}

function request(headers?: Record<string, string>): NextRequest {
    return new Request("http://localhost:3002/payments/plans", {
        method: "GET",
        headers: headers ?? {
            [AUTH_REQUEST_HEADER.USER_ID]: OWNER_UID,
            [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.COMMON,
            [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
            [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: OWNER_UID,
        },
    }) as unknown as NextRequest;
}

async function dataOf(response: Response) {
    const body = (await response.json()) as {
        data: { enabled: boolean; plans: { priceId: string }[] };
    };
    return body.data;
}

async function codeOf(response: Response): Promise<string> {
    const body = (await response.json()) as { error: { code: string } };
    return body.error.code;
}

beforeEach(() => {
    for (const mock of [
        resolveApiActorMock,
        findByReferenceIdMock,
        getStripeMock,
        isPaymentsConfiguredMock,
        pricesListMock,
    ]) {
        mock.mockReset();
    }
    envMock.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    resolveApiActorMock.mockResolvedValue({ uid: OWNER_UID });
    findByReferenceIdMock.mockImplementation((uid: string) =>
        Promise.resolve(uid === ADMIN_UID ? ADMIN_PROFILE : OWNER_PROFILE)
    );
    getStripeMock.mockReturnValue({ prices: { list: pricesListMock } });
    isPaymentsConfiguredMock.mockReturnValue(true);
    pricesListMock.mockResolvedValue({ data: [] });
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("GET /payments/plans — cobrança desligada", () => {
    it("responde enabled=false sem chave da Stripe e não chama a Stripe", async () => {
        getStripeMock.mockReturnValue(null);
        isPaymentsConfiguredMock.mockReturnValue(false);

        const response = await GET(request());

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(await dataOf(response)).toEqual({ enabled: false, plans: [] });
        expect(pricesListMock).not.toHaveBeenCalled();
    });

    it("responde enabled=false com só a chave secreta, sem o segredo do webhook", async () => {
        isPaymentsConfiguredMock.mockReturnValue(false);

        const response = await GET(request());

        expect(await dataOf(response)).toEqual({ enabled: false, plans: [] });
        expect(pricesListMock).not.toHaveBeenCalled();
    });

    it("responde enabled=false no modo simple, mesmo com as chaves", async () => {
        vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "simple");

        const response = await GET(request());

        expect(await dataOf(response)).toEqual({ enabled: false, plans: [] });
        expect(pricesListMock).not.toHaveBeenCalled();
    });

    it("responde enabled=false sem a URL do app para o retorno", async () => {
        envMock.NEXT_PUBLIC_APP_URL = undefined;

        const response = await GET(request());

        expect(await dataOf(response)).toEqual({ enabled: false, plans: [] });
    });
});

describe("GET /payments/plans — cobrança ligada", () => {
    it("pede à Stripe só preços recorrentes ativos, com o produto expandido", async () => {
        await GET(request());

        expect(pricesListMock).toHaveBeenCalledWith(
            expect.objectContaining({
                active: true,
                type: "recurring",
                expand: ["data.product"],
            })
        );
    });

    it("ordena do mais barato ao mais caro e descarta produto arquivado", async () => {
        pricesListMock.mockResolvedValue({
            data: [
                recurringPrice("price_business", BUSINESS_AMOUNT),
                recurringPrice("price_archived", ARCHIVED_AMOUNT, false),
                recurringPrice("price_pro", PRO_AMOUNT),
                recurringPrice("price_custom", null),
            ],
        });

        const response = await GET(request());
        const data = await dataOf(response);

        expect(data.enabled).toBe(true);
        expect(data.plans.map((plan) => plan.priceId)).toEqual([
            "price_pro",
            "price_business",
            "price_custom",
        ]);
    });

    it("responde enabled=true com catálogo vazio", async () => {
        const response = await GET(request());

        expect(await dataOf(response)).toEqual({ enabled: true, plans: [] });
    });

    it("responde 503 com código quando a Stripe falha, nunca 500", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {
            return;
        });
        pricesListMock.mockRejectedValue(
            Object.assign(new Error("Invalid API Key provided"), {
                type: "StripeAuthenticationError",
            })
        );

        const response = await GET(request());

        expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
        expect(await codeOf(response)).toBe("PAYMENTS_PROVIDER_UNAVAILABLE");
        warn.mockRestore();
    });
});

describe("GET /payments/plans — acesso", () => {
    it("recusa quem não apresenta credencial", async () => {
        resolveApiActorMock.mockResolvedValue(null);

        const response = await GET(request());

        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
        expect(await codeOf(response)).toBe("AUTH_INVALID_TOKEN");
    });

    it("recusa o admin fora de personificação", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: ADMIN_UID });

        const response = await GET(
            request({
                [AUTH_REQUEST_HEADER.USER_ID]: ADMIN_UID,
                [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.ADMIN,
                [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.ADMIN,
                [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: ADMIN_UID,
            })
        );

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
    });

    it("deixa o admin personificando ler os planos", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: ADMIN_UID });

        const response = await GET(
            request({
                [AUTH_REQUEST_HEADER.USER_ID]: ADMIN_UID,
                [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.ADMIN,
                [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
                [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: OWNER_UID,
            })
        );

        expect(response.status).toBe(HTTP_STATUS.OK);
    });
});
