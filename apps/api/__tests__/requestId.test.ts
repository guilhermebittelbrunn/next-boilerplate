// @vitest-environment node

import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildCorsHeaders } from "@/(shared)/lib/cors";

const { envMock, checkRateLimitMock } = vi.hoisted(() => ({
    envMock: { CORS_ORIGIN: undefined as string | undefined },
    checkRateLimitMock: vi.fn(),
}));

vi.mock("@/env", () => ({ env: envMock }));

vi.mock("@repo/security", () => ({
    checkRateLimit: (...args: unknown[]) => checkRateLimitMock(...args),
}));

const APP_ORIGIN = "http://localhost:3000";
const FOREIGN_ORIGIN = "https://evil.example";
const REQUEST_ID_HEADER = "x-request-id";
const UUID_V4 =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const RETRY_AFTER_SECONDS = 43;

type ProxyRequestOptions = {
    origin?: string;
    method?: string;
    path?: string;
    inboundRequestId?: string;
};

function makeRequest({
    origin,
    method = "GET",
    path = "/entities",
    inboundRequestId,
}: ProxyRequestOptions = {}): NextRequest {
    const headers = new Headers();
    if (origin) {
        headers.set("origin", origin);
    }
    if (inboundRequestId !== undefined) {
        headers.set(REQUEST_ID_HEADER, inboundRequestId);
    }

    return {
        method,
        headers,
        url: `http://localhost:3002${path}`,
        nextUrl: { pathname: path },
    } as unknown as NextRequest;
}

async function loadProxy() {
    envMock.CORS_ORIGIN = APP_ORIGIN;
    vi.resetModules();
    const proxyModule = await import("@/proxy");
    return proxyModule.proxy;
}

beforeEach(() => {
    checkRateLimitMock.mockReset();
    checkRateLimitMock.mockResolvedValue({ allowed: true, enforced: false });
    vi.spyOn(console, "warn").mockImplementation(() => {
        // the proxy logs its refusals; nothing here inspects them
    });
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe("request id on every answer", () => {
    it("stamps a v4 identifier on a request it lets through", async () => {
        const proxy = await loadProxy();

        const response = await proxy(makeRequest({ origin: APP_ORIGIN }));

        expect(response.headers.get(REQUEST_ID_HEADER)).toMatch(UUID_V4);
    });

    it("stamps one on a refused origin", async () => {
        const proxy = await loadProxy();

        const response = await proxy(makeRequest({ origin: FOREIGN_ORIGIN }));

        expect(response.headers.get(REQUEST_ID_HEADER)).toMatch(UUID_V4);
    });

    it("stamps one on a preflight it answers", async () => {
        const proxy = await loadProxy();

        const response = await proxy(
            makeRequest({ origin: APP_ORIGIN, method: "OPTIONS" })
        );

        expect(response.headers.get(REQUEST_ID_HEADER)).toMatch(UUID_V4);
    });

    it("stamps one on a refusal for a spent budget", async () => {
        const proxy = await loadProxy();
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

        expect(response.headers.get(REQUEST_ID_HEADER)).toMatch(UUID_V4);
    });

    it("gives two consecutive requests different identifiers", async () => {
        const proxy = await loadProxy();

        const first = await proxy(makeRequest({ origin: APP_ORIGIN }));
        const second = await proxy(makeRequest({ origin: APP_ORIGIN }));

        expect(first.headers.get(REQUEST_ID_HEADER)).not.toBe(
            second.headers.get(REQUEST_ID_HEADER)
        );
    });
});

describe("an inbound identifier is not honoured", () => {
    /**
     * Echoing the caller's value back would let anyone file log lines under an
     * identifier of their choosing, including one already used by a real incident.
     */
    it("overwrites whatever the caller sent", async () => {
        const proxy = await loadProxy();

        const response = await proxy(
            makeRequest({
                origin: APP_ORIGIN,
                inboundRequestId: "caller-supplied-value",
            })
        );
        const stamped = response.headers.get(REQUEST_ID_HEADER);

        expect(stamped).not.toBe("caller-supplied-value");
        expect(stamped).toMatch(UUID_V4);
    });

    it("does not let control characters through into the answer", async () => {
        const proxy = await loadProxy();

        const response = await proxy(
            makeRequest({
                origin: APP_ORIGIN,
                inboundRequestId: "forged value with spaces",
            })
        );

        expect(response.headers.get(REQUEST_ID_HEADER)).toMatch(UUID_V4);
    });
});

describe("the handler is handed the same identifier", () => {
    /**
     * `NextResponse.next({ request: { headers } })` does not mutate the incoming
     * request object: it encodes the override on the response, listing the names in
     * `x-middleware-override-headers` and carrying each value under an
     * `x-middleware-request-` prefix. That encoding is what the runtime replays onto
     * the request the route handler receives.
     */
    const forwardedRequestId = (response: Response): string | null =>
        response.headers.get(`x-middleware-request-${REQUEST_ID_HEADER}`);

    const overriddenNames = (response: Response): string[] =>
        (response.headers.get("x-middleware-override-headers") ?? "")
            .split(",")
            .map((name) => name.trim());

    it("forwards the identifier it stamped on the answer", async () => {
        const proxy = await loadProxy();

        const response = await proxy(makeRequest({ origin: APP_ORIGIN }));

        expect(overriddenNames(response)).toContain(REQUEST_ID_HEADER);
        expect(forwardedRequestId(response)).toBe(
            response.headers.get(REQUEST_ID_HEADER)
        );
    });

    /**
     * Without this the caller could file a log line under an identifier of its
     * choosing, because the route handler reads the header it was given.
     */
    it("replaces the value the caller tried to plant", async () => {
        const proxy = await loadProxy();

        const response = await proxy(
            makeRequest({
                origin: APP_ORIGIN,
                inboundRequestId: "caller-supplied-value",
            })
        );

        expect(forwardedRequestId(response)).not.toBe("caller-supplied-value");
        expect(forwardedRequestId(response)).toMatch(UUID_V4);
    });
});

describe("cross-origin visibility", () => {
    it("names the identifier among the headers a browser may read", () => {
        const exposed = (
            buildCorsHeaders(APP_ORIGIN)["Access-Control-Expose-Headers"] ?? ""
        )
            .split(",")
            .map((name) => name.trim().toLowerCase());

        expect(exposed).toContain(REQUEST_ID_HEADER);
        expect(exposed).toContain("retry-after");
    });
});
