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
const NO_CONTENT = 204;

function signUpRequest(): NextRequest {
    const headers = new Headers({ origin: APP_ORIGIN });

    return {
        method: "POST",
        headers,
        url: "http://localhost:3002/auth/sign-up",
        nextUrl: { pathname: "/auth/sign-up" },
    } as unknown as NextRequest;
}

/** The landing's server asks for the catalog without an `Origin`, on behalf of every visitor. */
function catalogRequest(): NextRequest {
    return {
        method: "GET",
        headers: new Headers(),
        url: "http://localhost:3002/payments/catalog",
        nextUrl: { pathname: "/payments/catalog" },
    } as unknown as NextRequest;
}

function appRequest(method: string, pathname: string): NextRequest {
    return {
        method,
        headers: new Headers({ origin: APP_ORIGIN }),
        url: `http://localhost:3002${pathname}`,
        nextUrl: { pathname },
    } as unknown as NextRequest;
}

function spendBudget(): void {
    protectMock.mockResolvedValue({
        isDenied: () => true,
        reason: {
            isRateLimit: () => true,
            isBot: () => false,
            reset: RETRY_AFTER_SECONDS,
        },
    });
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

    it("lets the public catalog through without asking the limiter, even with the budget spent", async () => {
        protectMock.mockResolvedValue({
            isDenied: () => true,
            reason: {
                isRateLimit: () => true,
                isBot: () => false,
                reset: RETRY_AFTER_SECONDS,
            },
        });
        const proxy = await loadProxyWithKey("ajkey_test");

        const response = await proxy(catalogRequest());

        expect(response.status).not.toBe(TOO_MANY_REQUESTS);
        expect(response.headers.get("x-middleware-next")).toBe("1");
        expect(protectMock).not.toHaveBeenCalled();
    });
});

describe("proxy rate limit on organization invitations", () => {
    it("lets the owner's invitation table through without asking the limiter, even with the budget spent", async () => {
        spendBudget();
        const proxy = await loadProxyWithKey("ajkey_test");

        const response = await proxy(
            appRequest("GET", "/organization/invitations")
        );

        expect(response.status).not.toBe(TOO_MANY_REQUESTS);
        expect(response.headers.get("x-middleware-next")).toBe("1");
        expect(protectMock).not.toHaveBeenCalled();
    });

    it("still answers the invitation preflight with 204", async () => {
        spendBudget();
        const proxy = await loadProxyWithKey("ajkey_test");

        const response = await proxy(
            appRequest("OPTIONS", "/organization/invitations")
        );

        expect(response.status).toBe(NO_CONTENT);
        expect(protectMock).not.toHaveBeenCalled();
    });

    it("refuses an invitation with AUTH_RATE_LIMITED once the budget is spent", async () => {
        spendBudget();
        const proxy = await loadProxyWithKey("ajkey_test");

        const response = await proxy(
            appRequest("POST", "/organization/invitations")
        );

        expect(response.status).toBe(TOO_MANY_REQUESTS);
        expect(await response.json()).toEqual({
            error: { code: "AUTH_RATE_LIMITED" },
        });
        expect(response.headers.get("Retry-After")).toBe(
            String(RETRY_AFTER_SECONDS)
        );
        expect(protectMock).toHaveBeenCalledTimes(1);
    });

    it("keeps counting any method on listed paths without a method exception", async () => {
        spendBudget();
        const proxy = await loadProxyWithKey("ajkey_test");

        const response = await proxy(appRequest("GET", "/account/export"));

        expect(response.status).toBe(TOO_MANY_REQUESTS);
        expect(protectMock).toHaveBeenCalledTimes(1);
    });
});
