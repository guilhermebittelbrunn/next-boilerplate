// @vitest-environment node

import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { envMock, arcjetMock, protectMock } = vi.hoisted(() => ({
    envMock: { CORS_ORIGIN: undefined as string | undefined },
    arcjetMock: vi.fn(),
    protectMock: vi.fn(),
}));

vi.mock("@/env", () => ({ env: envMock }));

vi.mock("@arcjet/next", () => ({
    default: (...args: unknown[]) => arcjetMock(...args),
    detectBot: vi.fn(),
    shield: vi.fn(),
    slidingWindow: vi.fn(),
    request: vi.fn(),
}));

const APP_ORIGIN = "http://localhost:3000";
const REQUEST_ID_HEADER = "x-request-id";
const RETRY_AFTER_SECONDS = 43;
const TOO_MANY_REQUESTS = 429;

function signUpRequest(): NextRequest {
    const headers = new Headers({ origin: APP_ORIGIN });

    return {
        method: "POST",
        headers,
        url: "http://localhost:3002/auth/sign-up",
        nextUrl: { pathname: "/auth/sign-up" },
    } as unknown as NextRequest;
}

async function loadProxyWithKey(arcjetKey: string) {
    vi.stubEnv("ARCJET_KEY", arcjetKey);
    envMock.CORS_ORIGIN = APP_ORIGIN;
    vi.resetModules();
    const proxyModule = await import("@/proxy");
    return proxyModule.proxy;
}

beforeEach(() => {
    arcjetMock.mockReset();
    protectMock.mockReset();
    arcjetMock.mockReturnValue({ protect: protectMock });
    vi.spyOn(console, "warn").mockImplementation(() => {
        // the proxy logs its refusals; nothing here inspects them
    });
});

afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

describe("proxy with the real rate limiter", () => {
    it("lets a rate-limited route through when ARCJET_KEY is not an Arcjet key", async () => {
        const proxy = await loadProxyWithKey("invalida");

        const response = await proxy(signUpRequest());

        expect(response.status).not.toBe(TOO_MANY_REQUESTS);
        expect(response.headers.get("x-middleware-next")).toBe("1");
        expect(response.headers.get(REQUEST_ID_HEADER)).toBeTruthy();
        expect(arcjetMock).not.toHaveBeenCalled();
    });

    it("refuses the request with AUTH_RATE_LIMITED once a real key spends the budget", async () => {
        protectMock.mockResolvedValue({
            isDenied: () => true,
            reason: {
                isRateLimit: () => true,
                isBot: () => false,
                reset: RETRY_AFTER_SECONDS,
            },
        });
        const proxy = await loadProxyWithKey("ajkey_test");

        const response = await proxy(signUpRequest());

        expect(response.status).toBe(TOO_MANY_REQUESTS);
        expect(await response.json()).toEqual({
            error: { code: "AUTH_RATE_LIMITED" },
        });
        expect(response.headers.get("Retry-After")).toBe(
            String(RETRY_AFTER_SECONDS)
        );
        expect(arcjetMock).toHaveBeenCalledWith(
            expect.objectContaining({ key: "ajkey_test" })
        );
    });
});
