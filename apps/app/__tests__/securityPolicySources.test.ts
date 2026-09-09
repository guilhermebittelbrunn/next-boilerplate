import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { envMock, getUserFromSessionCookieMock } = vi.hoisted(() => ({
    envMock: {
        ARCJET_KEY: undefined as string | undefined,
        NEXT_PUBLIC_API_URL: undefined as string | undefined,
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: undefined as string | undefined,
        NEXT_PUBLIC_GA_MEASUREMENT_ID: undefined as string | undefined,
    },
    getUserFromSessionCookieMock: vi.fn(),
}));

vi.mock("@/env", () => ({ env: envMock }));

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
const TAG_MANAGER = "https://www.googletagmanager.com";
const ORIGIN = "http://localhost:3000";
const PATH = "/pt-br/entities";

function makeRequest(): NextRequest {
    const href = `${ORIGIN}${PATH}`;
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

async function policyWith(
    overrides: Partial<typeof envMock>
): Promise<Map<string, string[]>> {
    Object.assign(envMock, {
        ARCJET_KEY: undefined,
        NEXT_PUBLIC_API_URL: API_URL,
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: AUTH_DOMAIN,
        NEXT_PUBLIC_GA_MEASUREMENT_ID: undefined,
        ...overrides,
    });

    vi.resetModules();
    const proxy = (await import("@/proxy")).default;
    const response = await proxy(makeRequest());
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

afterEach(() => {
    vi.unstubAllEnvs();
});

/**
 * Without the auth domain the popup resolver has no iframe origin to name, and the
 * directive collapses to the value that refuses every frame. Firebase sign-in is
 * already broken at that point; the policy must not be what makes it look otherwise.
 */
describe("frame sources without a configured auth domain", () => {
    it("refuses every frame instead of leaving the directive open", async () => {
        const policy = await policyWith({
            NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: undefined,
        });

        expect(policy.get("frame-src")).toEqual(["'none'"]);
        expect(policy.get("child-src")).toEqual(["'none'"]);
    });

    it("names the auth domain in both directives once it is configured", async () => {
        const policy = await policyWith({});

        expect(policy.get("frame-src")).toEqual([`https://${AUTH_DOMAIN}`]);
        expect(policy.get("child-src")).toEqual([`https://${AUTH_DOMAIN}`]);
    });
});

describe("connect sources", () => {
    it("keeps the directive free of empty entries when no API url is set", async () => {
        const connectSrc =
            (await policyWith({ NEXT_PUBLIC_API_URL: undefined })).get(
                "connect-src"
            ) ?? [];

        expect(connectSrc).toContain("'self'");
        expect(connectSrc).not.toContain("");
        expect(connectSrc).toContain("https://securetoken.googleapis.com");
    });
});

describe("analytics origins follow the measurement id", () => {
    it("names the tag manager once a measurement id is configured", async () => {
        const policy = await policyWith({
            NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-ABC123",
        });

        expect(policy.get("script-src")).toContain(TAG_MANAGER);
        expect(policy.get("connect-src")).toContain(
            "https://www.google-analytics.com"
        );
        expect(policy.get("img-src")).toContain(TAG_MANAGER);
    });

    it("ignores a measurement id that is not a Google Analytics 4 one", async () => {
        const policy = await policyWith({
            NEXT_PUBLIC_GA_MEASUREMENT_ID: "UA-123456-1",
        });

        expect(policy.get("script-src")).not.toContain(TAG_MANAGER);
        expect(policy.get("connect-src")).not.toContain(
            "https://www.google-analytics.com"
        );
    });
});

describe("script sources outside development", () => {
    it("forbids eval, which only the hot reloading server needs", async () => {
        const scriptSrc = (await policyWith({})).get("script-src") ?? [];

        expect(scriptSrc).not.toContain("'unsafe-eval'");
        expect(scriptSrc).not.toContain("https://va.vercel-scripts.com");
        expect(scriptSrc).toContain("https://apis.google.com");
    });

    it("allows eval while the development server is compiling", async () => {
        vi.stubEnv("NODE_ENV", "development");

        const scriptSrc = (await policyWith({})).get("script-src") ?? [];

        expect(scriptSrc).toContain("'unsafe-eval'");
        expect(scriptSrc).toContain("https://va.vercel-scripts.com");
    });
});
