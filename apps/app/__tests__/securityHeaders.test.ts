import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUserFromSessionCookieMock, secureMock, cookieSetMock } = vi.hoisted(
    () => ({
        getUserFromSessionCookieMock: vi.fn(),
        secureMock: vi.fn(),
        cookieSetMock: vi.fn(),
    })
);

vi.mock("@repo/auth/server", () => ({
    getUserFromSessionCookie: (...args: unknown[]) =>
        getUserFromSessionCookieMock(...args),
}));

vi.mock("@repo/security", () => ({
    secure: (...args: unknown[]) => secureMock(...args),
}));

vi.mock("@repo/auth/session", () => ({ clearSessionCookie: vi.fn() }));

vi.mock("@/lib/server/sessionAuthority", () => ({
    sessionAuthority: { check: vi.fn(), end: vi.fn() },
}));

vi.mock("next/headers", () => ({
    cookies: () => Promise.resolve({ set: cookieSetMock }),
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

const { default: proxy, config } = await import("@/proxy");

const ORIGIN = "http://localhost:3000";

const PERMISSIONS_POLICY =
    "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()";

function makeRequest(path: string, method = "GET") {
    const href = `${ORIGIN}${path}`;
    const url = new URL(href) as URL & { clone: () => URL };
    url.clone = () => new URL(href) as URL & { clone: () => URL };

    return {
        method,
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
    secureMock.mockReset();
    cookieSetMock.mockReset();
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

    it("turns off the browser features the panel does not use", async () => {
        const response = await proxy(makeRequest("/pt-br/entities"));

        expect(response.headers.get("permissions-policy")).toBe(
            PERMISSIONS_POLICY
        );
    });
});

describe("app security headers on the session routes", () => {
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
        expect(response.headers.get("content-security-policy")).toContain(
            "frame-ancestors 'none'"
        );
    });

    it("hands the request to the route without a redirect, a cookie or a session lookup", async () => {
        getUserFromSessionCookieMock.mockResolvedValue(null);

        const response = await proxy(makeRequest("/api/auth/session", "POST"));

        expect(response.headers.get("location")).toBeNull();
        expect(response.headers.get("x-middleware-next")).toBe("1");
        expect(cookieSetMock).not.toHaveBeenCalled();
        expect(getUserFromSessionCookieMock).not.toHaveBeenCalled();
        expect(secureMock).not.toHaveBeenCalled();
    });
});

describe("app proxy matcher", () => {
    const matches = (path: string) =>
        new RegExp(`^${config.matcher[0]}$`).test(path);

    it.each([
        "/api/auth/session",
        "/api/auth/session/refresh",
        "/api/auth/custom-token",
        "/pt-br/entities",
    ])("runs on %s", (path) => {
        expect(matches(path)).toBe(true);
    });

    it.each(["/_next/static/chunks/main.js", "/_next/image", "/favicon.ico"])(
        "still skips %s",
        (path) => {
            expect(matches(path)).toBe(false);
        }
    );
});
