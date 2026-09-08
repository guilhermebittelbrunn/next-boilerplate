import type { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@repo/security", () => ({ secure: vi.fn() }));

vi.mock("next/headers", () => ({
    cookies: () => Promise.resolve({ set: vi.fn() }),
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

function makeRequest(path: string) {
    const href = `${ORIGIN}${path}`;

    return {
        method: "GET",
        url: href,
        nextUrl: new URL(href),
        headers: new Headers(),
        cookies: { get: () => null },
    } as unknown as NextRequest;
}

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
});
