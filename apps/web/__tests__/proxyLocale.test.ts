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

const proxy = (await import("@/proxy")).default;

const ORIGIN = "http://localhost:3001";
const FORWARDED_LOCALE = `x-middleware-request-${LOCALE_REQUEST_HEADER}`;

function makeRequest(path: string, headers?: Record<string, string>) {
    const href = `${ORIGIN}${path}`;

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
        expect(cookieSetMock).toHaveBeenCalledWith("x-locale", "en");
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
