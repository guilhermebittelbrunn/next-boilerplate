// @vitest-environment node

import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/env", () => ({ env: { CORS_ORIGIN: "http://localhost:3000" } }));

const APP_ORIGIN = "http://localhost:3000";
const BURST = 70;
const TOO_MANY_REQUESTS = 429;
const originalKey = process.env.ARCJET_KEY;

function mutatingRequest(path: string): NextRequest {
    return {
        method: "POST",
        headers: new Headers({
            origin: APP_ORIGIN,
            authorization: "Bearer header.eyJzdWIiOiJ1aWQtMSJ9.signature",
        }),
        url: `http://localhost:3002${path}`,
        nextUrl: { pathname: path },
    } as unknown as NextRequest;
}

async function loadProxyWithKey(key: string | undefined) {
    if (key === undefined) {
        Reflect.deleteProperty(process.env, "ARCJET_KEY");
    } else {
        process.env.ARCJET_KEY = key;
    }
    vi.resetModules();
    return (await import("@/proxy")).proxy;
}

const realFetch = globalThis.fetch;
const networkCalls: string[] = [];

beforeEach(() => {
    networkCalls.length = 0;
    // Arcjet loads its WebAssembly from a `data:` URL on import; that never leaves the process.
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
        const url = String(input instanceof Request ? input.url : input);
        if (url.startsWith("data:")) {
            return realFetch(input, init);
        }
        networkCalls.push(url);
        return Promise.reject(new Error("unexpected network call"));
    });
});

afterEach(() => {
    vi.restoreAllMocks();
    if (originalKey === undefined) {
        Reflect.deleteProperty(process.env, "ARCJET_KEY");
        return;
    }
    process.env.ARCJET_KEY = originalKey;
});

describe("rate limit without a usable ARCJET_KEY", () => {
    it.each([
        ["absent", undefined],
        ["empty", ""],
        ["malformed", "invalida"],
    ])(
        "lets a burst through on both budgets when the key is %s",
        async (_label, key) => {
            const proxy = await loadProxyWithKey(key);
            const statuses: number[] = [];

            for (let attempt = 0; attempt < BURST; attempt++) {
                for (const path of [
                    "/notifications/read-all",
                    "/auth/sign-in",
                ]) {
                    const response = await proxy(mutatingRequest(path));
                    statuses.push(response.status);
                }
            }

            expect(statuses).toHaveLength(BURST * 2);
            expect(statuses).not.toContain(TOO_MANY_REQUESTS);
            expect(networkCalls).toEqual([]);
        }
    );
});
