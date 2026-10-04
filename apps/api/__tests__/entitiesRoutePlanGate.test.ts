import { UserRoleLevel } from "@repo/auth/types";
import { EntityType, UserType } from "@repo/sdk/src/types";
import { AUTH_REQUEST_HEADER } from "@repo/shared/utils/helpers/auth-request-headers";
import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    resolveApiActorMock,
    findByReferenceIdMock,
    listByUserIdMock,
    createMock,
    isBillingEnabledMock,
    envMock,
} = vi.hoisted(() => ({
    resolveApiActorMock: vi.fn(),
    findByReferenceIdMock: vi.fn(),
    listByUserIdMock: vi.fn(),
    createMock: vi.fn(),
    isBillingEnabledMock: vi.fn(),
    envMock: {
        NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE: undefined as string | undefined,
    },
}));

vi.mock("@/env", () => ({ env: envMock }));

vi.mock("@/(shared)/lib/billing", () => ({
    isBillingEnabled: () => isBillingEnabledMock(),
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

vi.mock("@/(shared)/repositories/entity.repository", () => ({
    entityRepository: {
        listByUserId: (...args: unknown[]) => listByUserIdMock(...args),
        create: (...args: unknown[]) => createMock(...args),
    },
}));

// Not `importActual`: the real module reaches Firebase Admin through `server-only`,
// which refuses to load outside a server component.
vi.mock("@/(shared)/lib/storage", () => ({
    isStorageConfigured: () => false,
    signReadUrl: vi.fn(),
    deleteObjectQuietly: vi.fn(),
    isStorageObjectPath: () => false,
    isOwnedBy: () => false,
}));

const { GET, POST } = await import("@/app/(routes)/entities/route");

const STATUS_CREATED = 201;
const OWNER_UID = "common-9";
const FEATURE = "advanced-reports";
const UNSUBSCRIBED = {
    id: "profile-1",
    reference_id: OWNER_UID,
    type: UserType.COMMON,
};
const SUBSCRIBED = { ...UNSUBSCRIBED, subscription: { status: "active" } };
const ENTITLED = { ...SUBSCRIBED, entitlements: { features: [FEATURE] } };
const VALID_BODY = {
    name: "Cliente QA",
    description: "Criada pelo teste do gate de plano",
    type: EntityType.CUSTOMER,
};

function request(method: "GET" | "POST"): NextRequest {
    return {
        method,
        url: "http://localhost:3002/entities",
        headers: new Headers({
            [AUTH_REQUEST_HEADER.USER_ID]: OWNER_UID,
            [AUTH_REQUEST_HEADER.USER_ROLE]: UserRoleLevel.COMMON,
            [AUTH_REQUEST_HEADER.REQUEST_ROLE]: UserRoleLevel.COMMON,
            [AUTH_REQUEST_HEADER.REQUEST_USER_ID]: OWNER_UID,
        }),
        json: () => Promise.resolve(VALID_BODY),
    } as unknown as NextRequest;
}

async function codeOf(response: Response): Promise<string> {
    const body = (await response.json()) as { error: { code: string } };
    return body.error.code;
}

beforeEach(() => {
    for (const mock of [
        resolveApiActorMock,
        findByReferenceIdMock,
        listByUserIdMock,
        createMock,
        isBillingEnabledMock,
    ]) {
        mock.mockReset();
    }
    envMock.NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE = undefined;
    isBillingEnabledMock.mockReturnValue(true);
    resolveApiActorMock.mockResolvedValue({ uid: OWNER_UID });
    findByReferenceIdMock.mockResolvedValue(UNSUBSCRIBED);
    listByUserIdMock.mockResolvedValue({ items: [], nextCursorId: null });
    createMock.mockImplementation((input: Record<string, unknown>) =>
        Promise.resolve({ id: "entity-1", ...input })
    );
});

describe("POST /entities — optional plan gate", () => {
    it("creates as before when no feature is configured, even without a subscription", async () => {
        const response = await POST(request("POST"));

        expect(response.status).toBe(STATUS_CREATED);
        expect(createMock).toHaveBeenCalledTimes(1);
    });

    it("treats an empty feature as no gate, which is how .env.example ships it", async () => {
        envMock.NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE = "";

        const response = await POST(request("POST"));

        expect(response.status).toBe(STATUS_CREATED);
    });

    it("refuses with PLAN_SUBSCRIPTION_REQUIRED and creates nothing without a subscription", async () => {
        envMock.NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE = FEATURE;

        const response = await POST(request("POST"));

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await codeOf(response)).toBe("PLAN_SUBSCRIPTION_REQUIRED");
        expect(createMock).not.toHaveBeenCalled();
    });

    it("refuses with PLAN_FEATURE_REQUIRED when the plan lacks the feature", async () => {
        envMock.NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE = FEATURE;
        findByReferenceIdMock.mockResolvedValue(SUBSCRIBED);

        const response = await POST(request("POST"));

        expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
        expect(await codeOf(response)).toBe("PLAN_FEATURE_REQUIRED");
        expect(createMock).not.toHaveBeenCalled();
    });

    it("creates when the plan includes the feature", async () => {
        envMock.NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE = FEATURE;
        findByReferenceIdMock.mockResolvedValue(ENTITLED);

        const response = await POST(request("POST"));

        expect(response.status).toBe(STATUS_CREATED);
        expect(createMock).toHaveBeenCalledWith(
            expect.objectContaining({ userId: "profile-1" })
        );
    });

    it("creates for anyone while billing is off, with the feature configured", async () => {
        envMock.NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE = FEATURE;
        isBillingEnabledMock.mockReturnValue(false);

        const response = await POST(request("POST"));

        expect(response.status).toBe(STATUS_CREATED);
    });

    it("never gates the list", async () => {
        envMock.NEXT_PUBLIC_ENTITY_REQUIRED_FEATURE = FEATURE;

        const response = await GET(request("GET"));

        expect(response.status).toBe(HTTP_STATUS.OK);
        expect(listByUserIdMock).toHaveBeenCalledTimes(1);
    });
});
