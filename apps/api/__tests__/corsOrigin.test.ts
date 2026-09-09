// @vitest-environment node

import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    buildCorsHeaders,
    isOriginAllowed,
    parseAllowedOrigins,
    resolveAllowedOrigins,
} from "@/(shared)/lib/cors";

const { envMock, checkRateLimitMock, warnMock } = vi.hoisted(() => ({
    envMock: { CORS_ORIGIN: undefined as string | undefined },
    checkRateLimitMock: vi.fn(),
    warnMock: vi.fn(),
}));

vi.mock("@/env", () => ({ env: envMock }));

vi.mock("@repo/security", () => ({
    checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
}));

const APP_ORIGIN = "http://localhost:3000";
const WEB_ORIGIN = "http://localhost:3001";
const FOREIGN_ORIGIN = "https://evil.example";
const OK = 200;
const NO_CONTENT = 204;
const FORBIDDEN = 403;
const TOO_MANY_REQUESTS = 429;
const RETRY_AFTER_SECONDS = 43;

type ProxyRequestOptions = {
    origin?: string;
    method?: string;
    path?: string;
};

function makeRequest({
    origin,
    method = "GET",
    path = "/entities",
}: ProxyRequestOptions = {}): NextRequest {
    const headers = new Headers();
    if (origin) {
        headers.set("origin", origin);
    }

    return {
        method,
        headers,
        url: `http://localhost:3002${path}`,
        nextUrl: { pathname: path },
    } as unknown as NextRequest;
}

async function loadProxy(corsOrigin: string | undefined) {
    envMock.CORS_ORIGIN = corsOrigin;
    vi.resetModules();
    const proxyModule = await import("@/proxy");
    return proxyModule.proxy;
}

beforeEach(() => {
    checkRateLimitMock.mockReset();
    checkRateLimitMock.mockResolvedValue({ allowed: true, enforced: false });
    warnMock.mockReset();
    vi.spyOn(console, "warn").mockImplementation(warnMock);
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
});

describe("allowed origin list", () => {
    it("reads a comma-separated list, tolerating spacing and stray commas", () => {
        expect(
            parseAllowedOrigins(` ${APP_ORIGIN} , ${WEB_ORIGIN} , `)
        ).toEqual([APP_ORIGIN, WEB_ORIGIN]);
    });

    it("has no origin at all when production leaves it unset", () => {
        expect(resolveAllowedOrigins(undefined, true)).toEqual([]);
        expect(resolveAllowedOrigins("", true)).toEqual([]);
    });

    it("falls back to the local front-ends outside production", () => {
        expect(resolveAllowedOrigins(undefined, false)).toEqual([
            APP_ORIGIN,
            WEB_ORIGIN,
        ]);
    });

    it("treats a missing origin header as a server-to-server call", () => {
        expect(isOriginAllowed(null, [])).toBe(true);
        expect(isOriginAllowed(FOREIGN_ORIGIN, [APP_ORIGIN])).toBe(false);
        expect(isOriginAllowed(APP_ORIGIN, [APP_ORIGIN])).toBe(true);
    });

    it("echoes the validated origin and varies the cache on it", () => {
        const headers = buildCorsHeaders(APP_ORIGIN);

        expect(headers["Access-Control-Allow-Origin"]).toBe(APP_ORIGIN);
        expect(headers.Vary).toBe("Origin");
    });

    it("lets the caller read the wait that comes with a refusal", () => {
        expect(
            buildCorsHeaders(APP_ORIGIN)["Access-Control-Expose-Headers"]
        ).toContain("Retry-After");
    });

    it("grants nothing when there is no origin to answer, but still varies", () => {
        expect(buildCorsHeaders(null)).toEqual({ Vary: "Origin" });
    });
});

describe("api proxy origin decision", () => {
    it("lets a server-to-server call through without CORS headers", async () => {
        const proxy = await loadProxy(APP_ORIGIN);

        const response = await proxy(makeRequest());

        expect(response.status).toBe(OK);
        expect(response.headers.get("access-control-allow-origin")).toBeNull();
    });

    it("answers an allowlisted origin with that exact origin", async () => {
        const proxy = await loadProxy(`${APP_ORIGIN},${WEB_ORIGIN}`);

        const response = await proxy(makeRequest({ origin: WEB_ORIGIN }));

        expect(response.headers.get("access-control-allow-origin")).toBe(
            WEB_ORIGIN
        );
        expect(response.headers.get("vary")).toBe("Origin");
    });

    it("refuses an origin outside the allowlist with a stable error code", async () => {
        const proxy = await loadProxy(APP_ORIGIN);

        const response = await proxy(makeRequest({ origin: FOREIGN_ORIGIN }));

        expect(response.status).toBe(FORBIDDEN);
        await expect(response.json()).resolves.toEqual({
            error: { code: "AUTH_FORBIDDEN_ORIGIN" },
        });
        expect(response.headers.get("access-control-allow-origin")).toBeNull();
    });

    it("answers an allowed preflight with the CORS headers", async () => {
        const proxy = await loadProxy(APP_ORIGIN);

        const response = await proxy(
            makeRequest({ origin: APP_ORIGIN, method: "OPTIONS" })
        );

        expect(response.status).toBe(NO_CONTENT);
        expect(response.headers.get("access-control-allow-origin")).toBe(
            APP_ORIGIN
        );
        expect(response.headers.get("access-control-allow-methods")).toContain(
            "PATCH"
        );
    });

    it("answers a refused preflight without permission to proceed", async () => {
        const proxy = await loadProxy(APP_ORIGIN);

        const response = await proxy(
            makeRequest({ origin: FOREIGN_ORIGIN, method: "OPTIONS" })
        );

        expect(response.status).toBe(NO_CONTENT);
        expect(response.headers.get("access-control-allow-origin")).toBeNull();
    });

    it("never answers with a wildcard, whatever the configuration", async () => {
        vi.stubEnv("NODE_ENV", "development");
        const proxy = await loadProxy(undefined);

        for (const origin of [APP_ORIGIN, WEB_ORIGIN]) {
            const response = await proxy(makeRequest({ origin }));

            expect(response.headers.get("access-control-allow-origin")).toBe(
                origin
            );
            expect(
                response.headers.get("access-control-allow-origin")
            ).not.toBe("*");
        }
    });

    it("varies the cache on origin even when it grants nothing", async () => {
        const proxy = await loadProxy(APP_ORIGIN);

        const refused = await proxy(makeRequest({ origin: FOREIGN_ORIGIN }));
        const originless = await proxy(makeRequest());

        expect(refused.headers.get("vary")).toBe("Origin");
        expect(originless.headers.get("vary")).toBe("Origin");
    });

    it("never lets a cross-origin caller send credentials", async () => {
        const proxy = await loadProxy(APP_ORIGIN);

        const response = await proxy(makeRequest({ origin: APP_ORIGIN }));

        expect(
            response.headers.get("access-control-allow-credentials")
        ).toBeNull();
    });

    it("records the refusal without any personal data", async () => {
        const proxy = await loadProxy(APP_ORIGIN);

        await proxy(makeRequest({ origin: FOREIGN_ORIGIN }));

        expect(warnMock).toHaveBeenCalledWith(
            "[security] blocked reason=origin path=/entities method=GET"
        );
    });
});

describe("api proxy security headers", () => {
    it("hardens every response it lets through", async () => {
        const proxy = await loadProxy(APP_ORIGIN);

        const response = await proxy(makeRequest({ origin: APP_ORIGIN }));

        expect(response.headers.get("content-security-policy")).toContain(
            "default-src 'none'"
        );
        expect(response.headers.get("x-content-type-options")).toBe("nosniff");
        expect(response.headers.get("strict-transport-security")).toContain(
            "max-age="
        );
    });

    it("hardens the responses it refuses too", async () => {
        const proxy = await loadProxy(APP_ORIGIN);

        const response = await proxy(makeRequest({ origin: FOREIGN_ORIGIN }));

        expect(response.headers.get("content-security-policy")).toContain(
            "frame-ancestors 'none'"
        );
    });
});

describe("api proxy rate limit", () => {
    it("leaves authenticated and webhook traffic alone", async () => {
        const proxy = await loadProxy(APP_ORIGIN);

        for (const path of ["/auth/me", "/webhooks/payments", "/health"]) {
            await proxy(makeRequest({ origin: APP_ORIGIN, path }));
        }

        expect(checkRateLimitMock).not.toHaveBeenCalled();
    });

    it("counts the public authentication endpoints", async () => {
        const proxy = await loadProxy(APP_ORIGIN);
        const publicAuthPaths = [
            "/auth/sign-in",
            "/auth/sign-up",
            "/auth/sign-in/google",
        ];

        for (const path of publicAuthPaths) {
            await proxy(
                makeRequest({ origin: APP_ORIGIN, method: "POST", path })
            );
        }

        expect(checkRateLimitMock).toHaveBeenCalledTimes(
            publicAuthPaths.length
        );
    });

    it("answers a spent budget with the code and the wait", async () => {
        const proxy = await loadProxy(APP_ORIGIN);
        checkRateLimitMock.mockResolvedValue({
            allowed: false,
            reason: "rate-limit",
            retryAfterSeconds: RETRY_AFTER_SECONDS,
        });

        const response = await proxy(
            makeRequest({
                origin: APP_ORIGIN,
                method: "POST",
                path: "/auth/sign-in",
            })
        );

        expect(response.status).toBe(TOO_MANY_REQUESTS);
        expect(response.headers.get("retry-after")).toBe(
            String(RETRY_AFTER_SECONDS)
        );
        expect(response.headers.get("access-control-allow-origin")).toBe(
            APP_ORIGIN
        );
        await expect(response.json()).resolves.toEqual({
            error: { code: "AUTH_RATE_LIMITED" },
        });
    });

    /**
     * A browser hides every response header from cross-origin scripts unless the
     * server names it, and `Retry-After` is not on the safelist that is exempt.
     */
    it("lets the cross-origin caller read the wait it just sent", async () => {
        const proxy = await loadProxy(APP_ORIGIN);
        checkRateLimitMock.mockResolvedValue({
            allowed: false,
            reason: "rate-limit",
            retryAfterSeconds: RETRY_AFTER_SECONDS,
        });

        const response = await proxy(
            makeRequest({
                origin: APP_ORIGIN,
                method: "POST",
                path: "/auth/sign-in",
            })
        );
        const exposed = (
            response.headers.get("access-control-expose-headers") ?? ""
        )
            .split(",")
            .map((name) => name.trim().toLowerCase());

        expect(response.headers.get("retry-after")).toBe(
            String(RETRY_AFTER_SECONDS)
        );
        expect(exposed).toContain("retry-after");
    });

    it("hardens a refused burst like any other response", async () => {
        const proxy = await loadProxy(APP_ORIGIN);
        checkRateLimitMock.mockResolvedValue({
            allowed: false,
            reason: "rate-limit",
            retryAfterSeconds: RETRY_AFTER_SECONDS,
        });

        const response = await proxy(
            makeRequest({
                origin: APP_ORIGIN,
                method: "POST",
                path: "/auth/sign-in",
            })
        );

        expect(response.headers.get("content-security-policy")).toContain(
            "default-src 'none'"
        );
        expect(response.headers.get("x-content-type-options")).toBe("nosniff");
        expect(response.headers.get("vary")).toBe("Origin");
    });

    it("records the spent budget without any personal data", async () => {
        const proxy = await loadProxy(APP_ORIGIN);
        checkRateLimitMock.mockResolvedValue({
            allowed: false,
            reason: "rate-limit",
            retryAfterSeconds: RETRY_AFTER_SECONDS,
        });

        await proxy(
            makeRequest({
                origin: APP_ORIGIN,
                method: "POST",
                path: "/auth/sign-in",
            })
        );

        expect(warnMock).toHaveBeenCalledWith(
            "[security] blocked reason=rate-limit path=/auth/sign-in method=POST"
        );
    });

    /**
     * The budget is spent on an exact pathname, so a sibling route under the same
     * prefix is unlimited until it is listed. Adding one is the price of never
     * charging `/auth/sign-in/google` twice for a single request.
     */
    it("counts the listed paths only, not their neighbours", async () => {
        const proxy = await loadProxy(APP_ORIGIN);

        for (const path of [
            "/auth/sign-in/",
            "/auth/sign-in/apple",
            "/auth/sign-in-again",
        ]) {
            await proxy(
                makeRequest({ origin: APP_ORIGIN, method: "POST", path })
            );
        }

        expect(checkRateLimitMock).not.toHaveBeenCalled();
    });

    it("omits the wait when the refusal carries none", async () => {
        const proxy = await loadProxy(APP_ORIGIN);
        checkRateLimitMock.mockResolvedValue({
            allowed: false,
            reason: "bot",
            retryAfterSeconds: null,
        });

        const response = await proxy(
            makeRequest({
                origin: APP_ORIGIN,
                method: "POST",
                path: "/auth/sign-up",
            })
        );

        expect(response.status).toBe(TOO_MANY_REQUESTS);
        expect(response.headers.get("retry-after")).toBeNull();
    });

    it("refuses a foreign origin before spending a rate limit call", async () => {
        const proxy = await loadProxy(APP_ORIGIN);

        await proxy(
            makeRequest({
                origin: FOREIGN_ORIGIN,
                method: "POST",
                path: "/auth/sign-in",
            })
        );

        expect(checkRateLimitMock).not.toHaveBeenCalled();
    });
});
