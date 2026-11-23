import { LOCALE_REQUEST_HEADER } from "@repo/internationalization/utils";
import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { secureMock } = vi.hoisted(() => ({ secureMock: vi.fn() }));

vi.mock("@repo/security", () => ({
    secure: (...args: unknown[]) => secureMock(...args),
}));

vi.mock("next/headers", () => ({
    cookies: () => Promise.resolve({ set: vi.fn() }),
}));

const ARCJET_KEY = "ajkey_test";
const OK = 200;
const FORBIDDEN = 403;
const ORIGIN = "http://localhost:3001";
const FORWARDED_LOCALE = `x-middleware-request-${LOCALE_REQUEST_HEADER}`;
const ALLOWED_BOTS = [
    "CATEGORY:SEARCH_ENGINE",
    "CATEGORY:PREVIEW",
    "CATEGORY:MONITOR",
];

function makeRequest(path: string, method = "GET") {
    const href = `${ORIGIN}${path}`;

    return {
        method,
        url: href,
        nextUrl: new URL(href),
        headers: new Headers({ "user-agent": "python-requests/2.31" }),
        cookies: { get: () => null },
    } as unknown as NextRequest;
}

/** Real env module on purpose: a mocked one cannot tell whether the key reaches the proxy. */
async function loadProxy(arcjetKey: string | undefined) {
    vi.stubEnv("ARCJET_KEY", arcjetKey);
    vi.resetModules();
    return (await import("@/proxy")).default;
}

beforeEach(() => {
    secureMock.mockReset();
    secureMock.mockResolvedValue(undefined);
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("web proxy bot protection with a key", () => {
    it("checks the visitor, letting search engines, previews and monitors through", async () => {
        const proxy = await loadProxy(ARCJET_KEY);
        const request = makeRequest("/pt-br");

        await proxy(request);

        expect(secureMock).toHaveBeenCalledTimes(1);
        expect(secureMock).toHaveBeenCalledWith(ALLOWED_BOTS, request);
    });

    it("refuses an automated client with 403 and the security headers", async () => {
        const proxy = await loadProxy(ARCJET_KEY);
        secureMock.mockRejectedValue(new Error("No bots allowed"));

        const response = await proxy(makeRequest("/pt-br"));

        expect(response.status).toBe(FORBIDDEN);
        expect(response.headers.get("x-content-type-options")).toBe("nosniff");
        expect(response.headers.get("permissions-policy")).toContain(
            "camera=()"
        );
        expect(
            response.headers.get("content-security-policy-report-only")
        ).toContain("default-src 'self'");
    });

    it("lets an allowed visitor reach the page", async () => {
        const proxy = await loadProxy(ARCJET_KEY);

        const response = await proxy(makeRequest("/pt-br"));

        expect(response.status).toBe(OK);
        expect(response.headers.get(FORWARDED_LOCALE)).toBe("pt-br");
    });

    it("never spends a check on the session routes", async () => {
        const proxy = await loadProxy(ARCJET_KEY);

        await proxy(makeRequest("/api/auth/session", "POST"));

        expect(secureMock).not.toHaveBeenCalled();
    });
});

describe("web proxy bot protection without a key", () => {
    it.each([
        ["absent", undefined],
        ["empty", ""],
    ])(
        "serves the page without checking when the key is %s",
        async (_label, key) => {
            const proxy = await loadProxy(key);

            const response = await proxy(makeRequest("/pt-br"));

            expect(secureMock).not.toHaveBeenCalled();
            expect(response.status).toBe(OK);
            expect(response.headers.get(FORWARDED_LOCALE)).toBe("pt-br");
        }
    );
});
