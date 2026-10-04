import { HTTP_STATUS } from "@repo/shared/utils/helpers/httpStatus";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { resolveApiCredentialMock, revokeMock } = vi.hoisted(() => ({
    resolveApiCredentialMock: vi.fn(),
    revokeMock: vi.fn(),
}));

vi.mock("@/(shared)/lib/resolve-api-actor", () => ({
    resolveApiCredential: (...args: unknown[]) =>
        resolveApiCredentialMock(...args),
}));

vi.mock("@/(shared)/repositories/session.repository", () => ({
    sessionRepository: {
        revoke: (...args: unknown[]) => revokeMock(...args),
    },
}));

const { GET, DELETE } = await import("@/app/(routes)/auth/session/route");

const NO_CONTENT = 204;
const UID = "uid-1";
const KEY = "1790500000";
const USER = { uid: UID };

function request(): NextRequest {
    return { headers: new Headers() } as unknown as NextRequest;
}

async function codeOf(response: Response): Promise<string> {
    const body = (await response.json()) as { error: { code: string } };
    return body.error.code;
}

beforeEach(() => {
    resolveApiCredentialMock.mockReset();
    revokeMock.mockReset();
    revokeMock.mockResolvedValue(undefined);
});

describe("GET /auth/session", () => {
    it("confirma a sessão ativa", async () => {
        resolveApiCredentialMock.mockResolvedValue({
            status: "active",
            user: USER,
            sessionKey: KEY,
        });

        const response = await GET(request());

        expect(response.status).toBe(HTTP_STATUS.OK);
        await expect(response.json()).resolves.toEqual({
            data: { active: true },
        });
    });

    it("responde AUTH_SESSION_REVOKED para a sessão encerrada", async () => {
        resolveApiCredentialMock.mockResolvedValue({ status: "revoked" });

        const response = await GET(request());

        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
        expect(await codeOf(response)).toBe("AUTH_SESSION_REVOKED");
    });

    it("responde AUTH_INVALID_TOKEN sem credencial válida", async () => {
        resolveApiCredentialMock.mockResolvedValue({ status: "anonymous" });

        const response = await GET(request());

        expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
        expect(await codeOf(response)).toBe("AUTH_INVALID_TOKEN");
    });
});

describe("DELETE /auth/session", () => {
    it("marca a sessão atual como encerrada por logout", async () => {
        resolveApiCredentialMock.mockResolvedValue({
            status: "active",
            user: USER,
            sessionKey: KEY,
        });

        const response = await DELETE(request());

        expect(response.status).toBe(NO_CONTENT);
        expect(revokeMock).toHaveBeenCalledWith(
            UID,
            KEY,
            "signed-out",
            expect.any(Date)
        );
    });

    it("responde 204 sem gravar quando não há o que encerrar", async () => {
        for (const credential of [
            { status: "anonymous" },
            { status: "revoked" },
            { status: "active", user: USER, sessionKey: null },
        ]) {
            resolveApiCredentialMock.mockResolvedValueOnce(credential);

            const response = await DELETE(request());

            expect(response.status).toBe(NO_CONTENT);
        }
        expect(revokeMock).not.toHaveBeenCalled();
    });
});
