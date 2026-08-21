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

vi.mock("next/headers", () => ({
    cookies: () => Promise.resolve({ set: cookieSetMock }),
}));

vi.mock("@/env", () => ({ env: { ARCJET_KEY: undefined } }));

const proxy = (await import("@/proxy")).default;

const ORIGIN = "http://localhost:3000";
const TEMPORARY_REDIRECT = 307;

function makeNextUrl(href: string) {
    const url = new URL(href) as URL & { clone: () => URL };
    url.clone = () => makeNextUrl(url.href);
    return url;
}

function makeRequest(path: string, options?: { token?: string }) {
    const href = `${ORIGIN}${path}`;
    return {
        method: "GET",
        url: href,
        nextUrl: makeNextUrl(href),
        headers: new Headers(),
        cookies: {
            get: (name: string) =>
                name === "access-token" && options?.token
                    ? { value: options.token }
                    : undefined,
        },
    } as unknown as NextRequest;
}

function signedIn(path: string) {
    getUserFromSessionCookieMock.mockResolvedValue({ uid: "uid-1" });
    return makeRequest(path, { token: "session-cookie" });
}

function anonymous(path: string) {
    getUserFromSessionCookieMock.mockResolvedValue(null);
    return makeRequest(path);
}

function locationOf(response: Response): string | null {
    const location = response.headers.get("location");
    return location ? location.replace(ORIGIN, "") : null;
}

beforeEach(() => {
    getUserFromSessionCookieMock.mockReset();
    secureMock.mockReset();
    cookieSetMock.mockReset();
});

describe("proxy static assets", () => {
    it("serves a path ending in a file extension without looking up the session", async () => {
        for (const path of ["/logo.png", "/pt-br/brand/icon.svg", "/sw.js"]) {
            const response = await proxy(makeRequest(path));

            expect(locationOf(response)).toBeNull();
            expect(getUserFromSessionCookieMock).not.toHaveBeenCalled();
        }
    });
});

describe("proxy locale", () => {
    it("prefixes a path that has no locale with the default one", async () => {
        const response = await proxy(anonymous("/entities"));

        expect(locationOf(response)).toBe("/pt-br/entities");
    });

    it("stores the locale of the path being served", async () => {
        await proxy(anonymous("/pt-br/sign-in"));

        expect(cookieSetMock).toHaveBeenCalledWith("x-locale", "pt-br");
    });
});

describe("proxy default deny", () => {
    it("sends an anonymous visitor to sign-in keeping the deep link", async () => {
        const response = await proxy(anonymous("/pt-br/entities/create"));

        expect(response.status).toBe(TEMPORARY_REDIRECT);
        expect(locationOf(response)).toBe(
            "/pt-br/sign-in?redirect=%2Fpt-br%2Fentities%2Fcreate"
        );
    });

    it("protects a route nobody listed as public", async () => {
        const response = await proxy(anonymous("/pt-br/brand-new-feature"));

        expect(locationOf(response)).toBe(
            "/pt-br/sign-in?redirect=%2Fpt-br%2Fbrand-new-feature"
        );
    });

    it("lets an anonymous visitor reach the public paths", async () => {
        for (const path of ["/pt-br/sign-in", "/pt-br/sign-up"]) {
            const response = await proxy(anonymous(path));

            expect(locationOf(response)).toBeNull();
        }
    });

    it("treats a nested public path as public", async () => {
        const response = await proxy(anonymous("/pt-br/sign-in/recover"));

        expect(locationOf(response)).toBeNull();
    });

    it("does not treat a path that merely starts with a public name as public", async () => {
        const response = await proxy(anonymous("/pt-br/sign-in-internal"));

        expect(locationOf(response)).toBe(
            "/pt-br/sign-in?redirect=%2Fpt-br%2Fsign-in-internal"
        );
    });

    it("lets a signed-in visitor through an authenticated route", async () => {
        const response = await proxy(signedIn("/pt-br/entities"));

        expect(locationOf(response)).toBeNull();
    });
});

describe("proxy bounce off the public paths", () => {
    it("sends a signed-in visitor to the deep link stored on the way in", async () => {
        const response = await proxy(
            signedIn("/pt-br/sign-in?redirect=%2Fpt-br%2Fentities%2Fcreate")
        );

        expect(response.status).toBe(TEMPORARY_REDIRECT);
        expect(locationOf(response)).toBe("/pt-br/entities/create");
    });

    it("falls back to the locale home with no deep link", async () => {
        const response = await proxy(signedIn("/pt-br/sign-in"));

        expect(locationOf(response)).toBe("/pt-br");
    });

    it("refuses a deep link pointing off site", async () => {
        for (const redirect of [
            "https%3A%2F%2Fevil.example.com",
            "%2F%2Fevil.example.com",
            "%2Fno-locale%2Fpath",
        ]) {
            const response = await proxy(
                signedIn(`/pt-br/sign-in?redirect=${redirect}`)
            );

            expect(locationOf(response)).toBe("/pt-br");
        }
    });
});
