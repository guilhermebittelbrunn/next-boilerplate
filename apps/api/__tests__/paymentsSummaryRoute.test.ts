import { UserRoleLevel } from "@repo/auth/types";
import { UserType } from "@repo/sdk/src/types";
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
    resolveApiActorMock,
    findByReferenceIdMock,
    buildBillingSummaryMock,
    getStripeSpy,
    envMock,
} = vi.hoisted(() => ({
    resolveApiActorMock: vi.fn(),
    findByReferenceIdMock: vi.fn(),
    buildBillingSummaryMock: vi.fn(),
    getStripeSpy: vi.fn(),
    envMock: {
        NEXT_PUBLIC_APP_URL: "http://localhost:3000" as string | undefined,
    },
}));

vi.mock("server-only", () => ({}));

vi.mock("@repo/payments", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@repo/payments")>();
    return {
        ...actual,
        getStripe: () => {
            getStripeSpy();
            return actual.getStripe();
        },
    };
});

vi.mock("@/env", () => ({ env: envMock }));

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

vi.mock("@/(shared)/lib/billing-summary", () => ({
    buildBillingSummary: (...args: unknown[]) =>
        buildBillingSummaryMock(...args),
}));

vi.mock("@/(shared)/repositories/plan-label.repository", () => ({
    planLabelRepository: {},
}));

const { GET } = await import("@/app/(routes)/payments/summary/route");

const ADMIN_UID = "admin-1";
const COMMON_UID = "common-9";

const ADMIN_PROFILE = {
    id: "p1",
    reference_id: ADMIN_UID,
    type: UserType.ADMIN,
};
const COMMON_PROFILE = {
    id: "p2",
    reference_id: COMMON_UID,
    type: UserType.COMMON,
};

const SUMMARY = {
    recentActivations: [],
    plans: [
        {
            priceId: "price_pro",
            productId: "prod_pro",
            name: "Pro",
            interval: "month",
            intervalCount: 1,
            count: 12,
        },
    ],
    revenue: {
        periodStart: "2026-09-01T00:00:00.000Z",
        periodEnd: "2026-10-01T00:00:00.000Z",
        byCurrency: [{ currency: "brl", amountPaid: 5800, invoiceCount: 2 }],
        trackingSince: "2026-08-30T09:12:00.000Z",
    },
};

function summaryRequest(uid = ADMIN_UID): NextRequest {
    const role = uid === ADMIN_UID ? UserRoleLevel.ADMIN : UserRoleLevel.COMMON;

    return {
        method: "GET",
        url: "http://localhost:3002/payments/summary",
        headers: new Headers({
            [AUTH_REQUEST_HEADER.USER_ID]: uid,
            [AUTH_REQUEST_HEADER.USER_ROLE]: role,
            [AUTH_REQUEST_HEADER.REQUEST_ROLE]: role,
            [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: uid,
        }),
    } as unknown as NextRequest;
}

async function errorCode(response: Response): Promise<string> {
    const body = (await response.json()) as { error: { code: string } };
    return body.error.code;
}

function configureStripe(secretKey: string, webhookSecret: string) {
    vi.stubEnv("STRIPE_SECRET_KEY", secretKey);
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", webhookSecret);
}

beforeEach(() => {
    for (const mock of [
        resolveApiActorMock,
        findByReferenceIdMock,
        buildBillingSummaryMock,
        getStripeSpy,
    ]) {
        mock.mockReset();
    }
    envMock.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "subscription");
    configureStripe("sk_test_offline_qa", "whsec_offline_qa");
    resolveApiActorMock.mockResolvedValue({ uid: ADMIN_UID });
    findByReferenceIdMock.mockResolvedValue(ADMIN_PROFILE);
    buildBillingSummaryMock.mockResolvedValue(SUMMARY);
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("GET /payments/summary — cobrança desligada", () => {
    it.each([
        ["sem chave secreta", "", "whsec_offline_qa"],
        ["sem segredo do webhook", "sk_test_offline_qa", ""],
        ["sem nenhuma chave", "", ""],
    ])(
        "%s responde 200 enabled=false sem ler o Firestore",
        async (_case, secretKey, webhookSecret) => {
            configureStripe(secretKey, webhookSecret);

            const response = await GET(summaryRequest());

            expect(response.status).toBe(HTTP_STATUS.OK);
            await expect(response.json()).resolves.toEqual({
                data: { enabled: false },
            });
            expect(buildBillingSummaryMock).not.toHaveBeenCalled();
        }
    );

    it("responde enabled=false no modo simple, mesmo com as chaves", async () => {
        vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "simple");

        const response = await GET(summaryRequest());

        await expect(response.json()).resolves.toEqual({
            data: { enabled: false },
        });
        expect(buildBillingSummaryMock).not.toHaveBeenCalled();
    });

    it("responde enabled=false sem a URL do app", async () => {
        envMock.NEXT_PUBLIC_APP_URL = undefined;

        const response = await GET(summaryRequest());

        await expect(response.json()).resolves.toEqual({
            data: { enabled: false },
        });
        expect(buildBillingSummaryMock).not.toHaveBeenCalled();
    });
});

describe("GET /payments/summary — cobrança ligada", () => {
    it("responde os três blocos dentro do envelope data", async () => {
        const response = await GET(summaryRequest());

        expect(response.status).toBe(HTTP_STATUS.OK);
        await expect(response.json()).resolves.toEqual({
            data: { enabled: true, ...SUMMARY },
        });
        expect(buildBillingSummaryMock).toHaveBeenCalledWith(expect.any(Date));
    });

    it("nunca chama a Stripe", async () => {
        await GET(summaryRequest());

        expect(getStripeSpy).not.toHaveBeenCalled();
    });

    it("degrada para 503 SUMMARY_INDEX_MISSING quando o Firestore pede índice", async () => {
        buildBillingSummaryMock.mockRejectedValue(
            Object.assign(
                new Error(
                    "9 FAILED_PRECONDITION: The query requires an index. You can create it here: https://console.firebase.google.com/..."
                ),
                { code: 9 }
            )
        );

        const response = await GET(summaryRequest());

        expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
        expect(await errorCode(response)).toBe("SUMMARY_INDEX_MISSING");
    });

    it("deixa subir a falha alheia em vez de rotulá-la como índice", async () => {
        buildBillingSummaryMock.mockRejectedValue(
            new Error("deadline exceeded")
        );

        await expect(GET(summaryRequest())).rejects.toThrow(
            "deadline exceeded"
        );
    });
});

describe("GET /payments/summary — autorização", () => {
    it("recusa perfil comum com 403 ADMIN_FORBIDDEN", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: COMMON_UID });
        findByReferenceIdMock.mockResolvedValue(COMMON_PROFILE);

        const response = await GET(summaryRequest(COMMON_UID));

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await errorCode(response)).toBe("ADMIN_FORBIDDEN");
        expect(buildBillingSummaryMock).not.toHaveBeenCalled();
    });

    it("recusa quem não está autenticado com 401 AUTH_INVALID_TOKEN", async () => {
        resolveApiActorMock.mockResolvedValue(null);

        const response = await GET(summaryRequest());

        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
        expect(await errorCode(response)).toBe("AUTH_INVALID_TOKEN");
        expect(buildBillingSummaryMock).not.toHaveBeenCalled();
    });

    it("com a cobrança desligada, ainda exige admin", async () => {
        configureStripe("", "");
        resolveApiActorMock.mockResolvedValue({ uid: COMMON_UID });
        findByReferenceIdMock.mockResolvedValue(COMMON_PROFILE);

        const response = await GET(summaryRequest(COMMON_UID));

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
    });

    it("exporta só GET", async () => {
        const handlers = await import("@/app/(routes)/payments/summary/route");

        expect(Object.keys(handlers)).toEqual(["GET"]);
    });
});
