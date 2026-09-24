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
    getStripeMock,
    isPaymentsConfiguredMock,
    portalCreateMock,
    envMock,
} = vi.hoisted(() => ({
    resolveApiActorMock: vi.fn(),
    findByReferenceIdMock: vi.fn(),
    getStripeMock: vi.fn(),
    isPaymentsConfiguredMock: vi.fn(),
    portalCreateMock: vi.fn(),
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

const { POST } = await import("@/app/(routes)/payments/portal/route");

const OWNER_UID = "common-9";
const ADMIN_UID = "admin-1";
const OWNER_PROFILE = {
    id: "profile-1",
    reference_id: OWNER_UID,
    type: UserType.COMMON,
    stripeCustomerId: "cus_qa",
};
const ADMIN_PROFILE = {
    id: "admin-profile",
    reference_id: ADMIN_UID,
    type: UserType.ADMIN,
};
const PORTAL_URL = "https://billing.stripe.com/p/session/test_qa";

const OWNER_HEADERS = {
    [AUTH_REQUEST_HEADER.USER_ID]: OWNER_UID,
    [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.COMMON,
    [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
    [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: OWNER_UID,
};

function request(body?: unknown, headers = OWNER_HEADERS) {
    return new Request("http://localhost:3002/payments/portal", {
        method: "POST",
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
    }) as unknown as NextRequest;
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
        getStripeMock,
        isPaymentsConfiguredMock,
        portalCreateMock,
    ]) {
        mock.mockReset();
    }
    envMock.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
    resolveApiActorMock.mockResolvedValue({ uid: OWNER_UID });
    findByReferenceIdMock.mockImplementation((uid: string) =>
        Promise.resolve(uid === ADMIN_UID ? ADMIN_PROFILE : OWNER_PROFILE)
    );
    getStripeMock.mockReturnValue({
        billingPortal: { sessions: { create: portalCreateMock } },
    });
    isPaymentsConfiguredMock.mockReturnValue(true);
    portalCreateMock.mockResolvedValue({ url: PORTAL_URL });
    warn = vi.spyOn(console, "warn").mockImplementation(() => {
        return;
    });
});

afterEach(() => {
    vi.unstubAllEnvs();
    warn.mockRestore();
});

describe("POST /payments/portal", () => {
    it("responde 503 PAYMENTS_NOT_CONFIGURED sem as chaves", async () => {
        getStripeMock.mockReturnValue(null);
        isPaymentsConfiguredMock.mockReturnValue(false);

        const response = await POST(request({}));

        expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
        expect(await codeOf(response)).toBe("PAYMENTS_NOT_CONFIGURED");
    });

    it("responde 503 no modo simple", async () => {
        vi.stubEnv("NEXT_PUBLIC_PRODUCT_MODE", "simple");

        const response = await POST(request({}));

        expect(await codeOf(response)).toBe("PAYMENTS_NOT_CONFIGURED");
        expect(portalCreateMock).not.toHaveBeenCalled();
    });

    it("responde 409 quando o perfil não tem cliente Stripe", async () => {
        findByReferenceIdMock.mockResolvedValue({
            ...OWNER_PROFILE,
            stripeCustomerId: undefined,
        });

        const response = await POST(request({}));

        expect(response.status).toBe(HTTP_STATUS.CONFLICT);
        expect(await codeOf(response)).toBe("PAYMENTS_CUSTOMER_NOT_FOUND");
        expect(portalCreateMock).not.toHaveBeenCalled();
    });

    it("abre o portal do cliente com retorno para a aba billing no idioma da tela", async () => {
        const response = await POST(request({ locale: "es" }));
        const body = (await response.json()) as { data: { url: string } };

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(body.data.url).toBe(PORTAL_URL);
        expect(portalCreateMock).toHaveBeenCalledWith({
            customer: "cus_qa",
            return_url: "http://localhost:3000/es/account?tab=billing",
            locale: "es",
        });
    });

    it("aceita a requisição sem corpo", async () => {
        const response = await POST(request());

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(portalCreateMock).toHaveBeenCalledWith(
            expect.objectContaining({ locale: "pt-BR" })
        );
    });

    it("recusa locale fora da lista", async () => {
        const response = await POST(request({ locale: "fr" }));

        expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
        expect(await codeOf(response)).toBe("VALIDATION_FAILED");
    });

    it("responde 503 PAYMENTS_PROVIDER_UNAVAILABLE quando a Stripe falha", async () => {
        portalCreateMock.mockRejectedValue(
            new Error("No configuration provided")
        );

        const response = await POST(request({}));

        expect(response.status).toBe(HTTP_STATUS.SERVICE_UNAVAILABLE);
        expect(await codeOf(response)).toBe("PAYMENTS_PROVIDER_UNAVAILABLE");
    });

    it("recusa escrita durante personificação", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: ADMIN_UID });

        const response = await POST(
            request(
                {},
                {
                    [AUTH_REQUEST_HEADER.USER_ID]: ADMIN_UID,
                    [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.ADMIN,
                    [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
                    [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: OWNER_UID,
                }
            )
        );

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await codeOf(response)).toBe(
            "AUTH_REQUEST_IMPERSONATION_READ_ONLY"
        );
        expect(portalCreateMock).not.toHaveBeenCalled();
    });
});
