import { LOCALE_REQUEST_HEADER } from "@repo/internationalization/utils";
import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { cookieSetMock } = vi.hoisted(() => ({ cookieSetMock: vi.fn() }));

vi.mock("@repo/security", () => ({ secure: vi.fn() }));

vi.mock("next/headers", () => ({
    cookies: () => Promise.resolve({ set: cookieSetMock }),
}));

vi.mock("@/env", () => ({
    env: {
        ARCJET_KEY: undefined,
        NEXT_PUBLIC_API_URL: "http://localhost:3002",
    },
}));

const { default: proxy, config } = await import("@/proxy");

const ORIGIN = "http://localhost:3001";
const HTTPS_ORIGIN = "https://www.example.com";
const ONE_HUNDRED_EIGHTY_DAYS_IN_SECONDS = 15_552_000;

const localeCookieOptions = (secure: boolean) => ({
    path: "/",
    sameSite: "lax",
    maxAge: ONE_HUNDRED_EIGHTY_DAYS_IN_SECONDS,
    secure,
});
const FORWARDED_LOCALE = `x-middleware-request-${LOCALE_REQUEST_HEADER}`;

function makeRequest(
    path: string,
    headers?: Record<string, string>,
    origin = ORIGIN
) {
    const href = `${origin}${path}`;

    return {
        method: "GET",
        url: href,
        nextUrl: new URL(href),
        headers: new Headers(headers),
        cookies: { get: () => null },
    } as unknown as NextRequest;
}

beforeEach(() => {
    cookieSetMock.mockReset();
});

describe("web proxy locale forwarding", () => {
    it("hands the URL locale to server rendering and still remembers it in the cookie", async () => {
        const response = await proxy(makeRequest("/en"));

        expect(response.headers.get(FORWARDED_LOCALE)).toBe("en");
        expect(response.headers.get("x-middleware-override-headers")).toContain(
            LOCALE_REQUEST_HEADER
        );
        expect(cookieSetMock).toHaveBeenCalledWith(
            "x-locale",
            "en",
            localeCookieOptions(false)
        );
    });

    it("forwards the locale of a nested page", async () => {
        const response = await proxy(makeRequest("/es/pricing"));

        expect(response.headers.get(FORWARDED_LOCALE)).toBe("es");
    });

    it("replaces a locale header the browser sent", async () => {
        const response = await proxy(
            makeRequest("/pt-br", { [LOCALE_REQUEST_HEADER]: "es" })
        );

        expect(response.headers.get(FORWARDED_LOCALE)).toBe("pt-br");
    });

    it("keeps the request headers the browser sent", async () => {
        const response = await proxy(
            makeRequest("/en", { "accept-language": "en-US" })
        );

        expect(
            response.headers.get("x-middleware-request-accept-language")
        ).toBe("en-US");
    });

    it("does not forward anything on the redirect to the default locale", async () => {
        const response = await proxy(makeRequest("/pricing"));

        expect(response.headers.get("location")).toContain("/pt-br/pricing");
        expect(response.headers.get(FORWARDED_LOCALE)).toBeNull();
    });
});

describe("web proxy locale cookie", () => {
    it("keeps the default locale for 180 days on the redirect, without Secure over HTTP", async () => {
        await proxy(makeRequest("/pricing"));

        expect(cookieSetMock).toHaveBeenCalledWith(
            "x-locale",
            "pt-br",
            localeCookieOptions(false)
        );
    });

    it("marks the cookie Secure when the request arrived over HTTPS", async () => {
        await proxy(makeRequest("/es/pricing", undefined, HTTPS_ORIGIN));
        await proxy(makeRequest("/pricing", undefined, HTTPS_ORIGIN));

        expect(cookieSetMock.mock.calls).toEqual([
            ["x-locale", "es", localeCookieOptions(true)],
            ["x-locale", "pt-br", localeCookieOptions(true)],
        ]);
    });
});

describe("web proxy matcher", () => {
    const matches = (path: string) =>
        new RegExp(`^${config.matcher[0]}$`).test(path);

    it("serves the showcase video straight from public, without a locale redirect", () => {
        expect(matches("/showcase/showcase.mp4")).toBe(false);
        expect(matches("/showcase/showcase.gif")).toBe(false);
    });

    it("still runs on localized pages", () => {
        expect(matches("/pt-br")).toBe(true);
        expect(matches("/en/pricing")).toBe(true);
    });

    it.each([
        "/api/auth/session",
        "/api/auth/session/refresh",
        "/api/auth/custom-token",
    ])(
        "runs on the session route %s, so it carries the security headers",
        (path) => {
            expect(matches(path)).toBe(true);
        }
    );

    it.each([
        "/_next/static/chunks/main.js",
        "/_next/image",
        "/favicon.ico",
        "/robots.txt",
        "/sitemap.xml",
    ])("still skips %s", (path) => {
        expect(matches(path)).toBe(false);
    });
});
