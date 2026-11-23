import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { secureMock, cookieSetMock } = vi.hoisted(() => ({
    secureMock: vi.fn(),
    cookieSetMock: vi.fn(),
}));

vi.mock("@repo/security", () => ({
    secure: (...args: unknown[]) => secureMock(...args),
}));

vi.mock("next/headers", () => ({
    cookies: () => Promise.resolve({ set: cookieSetMock }),
}));

const AUTH_DOMAIN = "demo-project.firebaseapp.com";
const API_URL = "http://localhost:3002";

vi.mock("@/env", () => ({
    env: {
        ARCJET_KEY: undefined,
        NEXT_PUBLIC_API_URL: API_URL,
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: AUTH_DOMAIN,
    },
}));

const proxy = (await import("@/proxy")).default;

const ORIGIN = "http://localhost:3001";

const PERMISSIONS_POLICY =
    "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()";

function makeRequest(path: string, method = "GET") {
    const href = `${ORIGIN}${path}`;

    return {
        method,
        url: href,
        nextUrl: new URL(href),
        headers: new Headers(),
        cookies: { get: () => null },
    } as unknown as NextRequest;
}

beforeEach(() => {
    secureMock.mockReset();
    cookieSetMock.mockReset();
});

describe("web security headers", () => {
    it("reports violations instead of blocking the landing", async () => {
        const response = await proxy(makeRequest("/pt-br"));

        expect(
            response.headers.get("content-security-policy-report-only")
        ).toContain("default-src 'self'");
        expect(response.headers.get("content-security-policy")).toBeNull();
    });

    it("names the same origins the app relies on", async () => {
        const policy =
            (await proxy(makeRequest("/pt-br"))).headers.get(
                "content-security-policy-report-only"
            ) ?? "";

        expect(policy).toContain(API_URL);
        expect(policy).toContain("https://identitytoolkit.googleapis.com");
        expect(policy).toContain(`frame-src https://${AUTH_DOMAIN}`);
    });

    it("still enforces the headers that are not the policy", async () => {
        const response = await proxy(makeRequest("/pt-br"));

        expect(response.headers.get("x-content-type-options")).toBe("nosniff");
        expect(response.headers.get("strict-transport-security")).toContain(
            "max-age="
        );
        expect(response.headers.get("cross-origin-opener-policy")).toBe(
            "same-origin-allow-popups"
        );
    });

    it("hardens the locale redirect as well", async () => {
        const response = await proxy(makeRequest("/"));

        expect(response.headers.get("location")).toContain("/pt-br");
        expect(
            response.headers.get("content-security-policy-report-only")
        ).toBeTruthy();
    });

    it("turns off the browser features the landing does not use", async () => {
        const response = await proxy(makeRequest("/pt-br"));

        expect(response.headers.get("permissions-policy")).toBe(
            PERMISSIONS_POLICY
        );
    });
});

describe("web security headers on the session routes", () => {
    it.each([
        ["POST", "/api/auth/session"],
        ["DELETE", "/api/auth/session"],
        ["POST", "/api/auth/session/refresh"],
        ["POST", "/api/auth/custom-token"],
    ])("sends the page headers on %s %s", async (method, path) => {
        const response = await proxy(makeRequest(path, method));

        expect(response.headers.get("strict-transport-security")).toContain(
            "max-age="
        );
        expect(response.headers.get("x-content-type-options")).toBe("nosniff");
        expect(response.headers.get("referrer-policy")).toBe("no-referrer");
        expect(response.headers.get("permissions-policy")).toBe(
            PERMISSIONS_POLICY
        );
        expect(
            response.headers.get("content-security-policy-report-only")
        ).toContain("default-src 'self'");
    });

    it("hands the request to the route without a locale redirect or cookie", async () => {
        const response = await proxy(makeRequest("/api/auth/session", "POST"));

        expect(response.headers.get("location")).toBeNull();
        expect(response.headers.get("x-middleware-next")).toBe("1");
        expect(cookieSetMock).not.toHaveBeenCalled();
        expect(secureMock).not.toHaveBeenCalled();
    });
});
