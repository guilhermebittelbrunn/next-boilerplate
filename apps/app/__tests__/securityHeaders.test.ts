import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUserFromSessionCookieMock } = vi.hoisted(() => ({
    getUserFromSessionCookieMock: vi.fn(),
}));

vi.mock("@repo/auth/server", () => ({
    getUserFromSessionCookie: (...args: unknown[]) =>
        getUserFromSessionCookieMock(...args),
}));

vi.mock("@repo/security", () => ({ secure: vi.fn() }));

vi.mock("next/headers", () => ({
    cookies: () => Promise.resolve({ set: vi.fn() }),
}));

const DIRECTIVE_SEPARATOR = /\s+/;

const AUTH_DOMAIN = "demo-project.firebaseapp.com";
const API_URL = "http://localhost:3002";

vi.mock("@/env", () => ({
    env: {
        ARCJET_KEY: undefined,
        NEXT_PUBLIC_API_URL: API_URL,
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: AUTH_DOMAIN,
        NEXT_PUBLIC_GA_MEASUREMENT_ID: undefined,
    },
}));

const proxy = (await import("@/proxy")).default;

const ORIGIN = "http://localhost:3000";

function makeRequest(path: string) {
    const href = `${ORIGIN}${path}`;
    const url = new URL(href) as URL & { clone: () => URL };
    url.clone = () => new URL(href) as URL & { clone: () => URL };

    return {
        method: "GET",
        url: href,
        nextUrl: url,
        headers: new Headers(),
        cookies: { get: () => ({ value: "session-cookie" }) },
    } as unknown as NextRequest;
}

async function policyFor(path: string): Promise<Map<string, string[]>> {
    const response = await proxy(makeRequest(path));
    const raw = response.headers.get("content-security-policy") ?? "";

    return new Map(
        raw
            .split(";")
            .map((chunk) => chunk.trim())
            .filter(Boolean)
            .map((chunk) => {
                const [name, ...sources] = chunk.split(DIRECTIVE_SEPARATOR);
                return [name as string, sources] as const;
            })
    );
}

beforeEach(() => {
    getUserFromSessionCookieMock.mockReset();
    getUserFromSessionCookieMock.mockResolvedValue({ uid: "uid-1" });
});

describe("app security headers", () => {
    it("blocks rather than reports", async () => {
        const response = await proxy(makeRequest("/pt-br/entities"));

        expect(response.headers.get("content-security-policy")).toBeTruthy();
        expect(
            response.headers.get("content-security-policy-report-only")
        ).toBeNull();
    });

    it("lets the SDK reach the API it was configured with", async () => {
        const connectSrc = (await policyFor("/pt-br/entities")).get(
            "connect-src"
        );

        expect(connectSrc).toContain(API_URL);
        expect(connectSrc).toContain("https://identitytoolkit.googleapis.com");
        expect(connectSrc).toContain("https://securetoken.googleapis.com");
    });

    it("frames the Firebase auth domain the popup needs", async () => {
        expect((await policyFor("/pt-br/entities")).get("frame-src")).toEqual([
            `https://${AUTH_DOMAIN}`,
        ]);
    });

    it("serves the Google profile picture in the account menu", async () => {
        expect((await policyFor("/pt-br/entities")).get("img-src")).toContain(
            "https://lh3.googleusercontent.com"
        );
    });

    it("leaves analytics origins out while analytics is unconfigured", async () => {
        expect(
            (await policyFor("/pt-br/entities")).get("script-src")
        ).not.toContain("https://www.googletagmanager.com");
    });

    it("hardens the redirects too, not only the pages it serves", async () => {
        getUserFromSessionCookieMock.mockResolvedValue(null);

        const response = await proxy(makeRequest("/pt-br/entities"));

        expect(response.headers.get("location")).toContain("/pt-br/sign-in");
        expect(response.headers.get("content-security-policy")).toContain(
            "frame-ancestors 'none'"
        );
    });

    it("keeps the sign-in popup connected to the page that opened it", async () => {
        const response = await proxy(makeRequest("/pt-br/entities"));

        expect(response.headers.get("cross-origin-opener-policy")).toBe(
            "same-origin-allow-popups"
        );
        expect(response.headers.get("cross-origin-embedder-policy")).toBeNull();
    });
});
