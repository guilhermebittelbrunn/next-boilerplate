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
const USER = { uid: UID, email: "qa-api-error-codes@example.com" };

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

    it("devolve o usuário mesclado em data", async () => {
        resolveApiActorMock.mockResolvedValue({ uid: UID });
        getMergedUserByUidMock.mockResolvedValue(USER);

        const response = await GET(request());

        expect(response.status).toBe(HTTP_STATUS.OK);
        await expect(response.json()).resolves.toEqual({ data: USER });
    });
});
