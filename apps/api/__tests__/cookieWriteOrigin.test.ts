import type { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { isUnprovenCookieWrite } from "@/(shared)/lib/cookie-write-origin";

type Shape = {
    method?: string;
    origin?: string;
    secFetchSite?: string;
    authorization?: string;
    sessionCookie?: boolean;
};

const UNPROVEN: Required<
    Omit<Shape, "origin" | "secFetchSite" | "authorization">
> = {
    method: "POST",
    sessionCookie: true,
};

function request({
    method = "POST",
    origin,
    secFetchSite,
    authorization,
    sessionCookie = false,
}: Shape): NextRequest {
    const headers = new Headers();
    if (origin) {
        headers.set("origin", origin);
    }
    if (secFetchSite) {
        headers.set("sec-fetch-site", secFetchSite);
    }
    if (authorization) {
        headers.set("authorization", authorization);
    }
    return {
        method,
        headers,
        cookies: {
            has: (name: string) => sessionCookie && name === "access-token",
        },
    } as unknown as NextRequest;
}

describe("isUnprovenCookieWrite", () => {
    it.each(["POST", "PUT", "PATCH", "DELETE"])(
        "%s carried only by the session cookie is unproven",
        (method) => {
            expect(
                isUnprovenCookieWrite(request({ ...UNPROVEN, method }))
            ).toBe(true);
        }
    );

    it.each(["cross-site", "same-site", "none"])(
        "Sec-Fetch-Site %s does not prove the origin",
        (secFetchSite) => {
            expect(
                isUnprovenCookieWrite(request({ ...UNPROVEN, secFetchSite }))
            ).toBe(true);
        }
    );

    it.each([
        ["a safe method", { method: "GET" }],
        ["HEAD", { method: "HEAD" }],
        ["OPTIONS", { method: "OPTIONS" }],
        ["an Origin header", { origin: "http://localhost:3000" }],
        ["Sec-Fetch-Site same-origin", { secFetchSite: "same-origin" }],
        ["an Authorization header", { authorization: "Bearer token" }],
        ["no session cookie", { sessionCookie: false }],
    ] as const)(
        "each condition alone frees the request: %s",
        (_label, change) => {
            expect(
                isUnprovenCookieWrite(request({ ...UNPROVEN, ...change }))
            ).toBe(false);
        }
    );
});
