import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { resolveApiActorMock, getMergedUserByUidMock } = vi.hoisted(() => ({
    resolveApiActorMock: vi.fn(),
    getMergedUserByUidMock: vi.fn(),
}));

vi.mock("@/(shared)/lib/resolve-api-actor", () => ({
    resolveApiActor: (...args: unknown[]) => resolveApiActorMock(...args),
}));

vi.mock("@/(shared)/lib/user-merge", () => ({
    getMergedUserByUid: (...args: unknown[]) => getMergedUserByUidMock(...args),
}));

const { GET } = await import("@/app/(routes)/auth/me/route");

const UID = "uid-me-1";
const USER = {
    uid: UID,
    email: "qa-api-error-codes@example.com",
    id: "profile-1",
    reference_id: UID,
    type: "common",
    createdAt: "2024-03-01T10:00:00.000Z",
    stripeCustomerId: "cus_internal",
    subscription: { status: "active" },
    entitlements: { plan: "pro" },
    customClaims: { role: "admin" },
    tokensValidAfterTime: "Mon, 01 Jan 2024 00:00:00 GMT",
    providerData: [{ providerId: "password" }],
    metadata: { creationTime: "Mon, 01 Jan 2024 00:00:00 GMT" },
    preferences: { theme: "dark", locale: "pt-br" },
    onboarding: { step: "profile", completedAt: null },
    someFieldAddedLater: "private",
};
const SESSION_USER = {
    uid: UID,
    type: "common",
    email: USER.email,
    preferences: { theme: "dark", locale: "pt-br" },
    onboarding: { step: "profile", completedAt: null },
};

function request(): NextRequest {
    return { headers: new Headers() } as unknown as NextRequest;
}

beforeEach(() => {
    resolveApiActorMock.mockReset();
    getMergedUserByUidMock.mockReset();
});

describe("GET /auth/me", () => {
    it("responde 401 AUTH_INVALID_TOKEN sem credencial ativa", async () => {
        resolveApiActorMock.mockResolvedValue(null);

        const response = await GET(request());

        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
        await expect(response.json()).resolves.toEqual({
            error: { code: "AUTH_INVALID_TOKEN" },
        });
        expect(getMergedUserByUidMock).not.toHaveBeenCalled();
    });

    it("responde 401 AUTH_INVALID_TOKEN quando a conta não existe mais no Auth", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: UID });
        getMergedUserByUidMock.mockResolvedValue(null);

        const response = await GET(request());

        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
        await expect(response.json()).resolves.toEqual({
            error: { code: "AUTH_INVALID_TOKEN" },
        });
        expect(getMergedUserByUidMock).toHaveBeenCalledWith(UID);
    });

    it("devolve em data só os campos da allowlist do usuário mesclado", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: UID });
        getMergedUserByUidMock.mockResolvedValue(USER);

        const response = await GET(request());

        expect(response.status).toBe(HTTP_STATUS.OK);
        await expect(response.json()).resolves.toEqual({ data: SESSION_USER });
    });
});
