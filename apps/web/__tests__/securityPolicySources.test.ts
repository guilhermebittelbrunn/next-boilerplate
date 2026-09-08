import type { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const { envMock } = vi.hoisted(() => ({
    envMock: {
        ARCJET_KEY: undefined as string | undefined,
        NEXT_PUBLIC_API_URL: undefined as string | undefined,
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: undefined as string | undefined,
    },
}));

vi.mock("@/env", () => ({ env: envMock }));

vi.mock("@repo/security", () => ({ secure: vi.fn() }));

vi.mock("next/headers", () => ({
    cookies: () => Promise.resolve({ set: vi.fn() }),
}));

const DIRECTIVE_SEPARATOR = /\s+/;

const AUTH_DOMAIN = "demo-project.firebaseapp.com";
const API_URL = "http://localhost:3002";
const ORIGIN = "http://localhost:3001";
const PATH = "/pt-br";

function makeRequest(): NextRequest {
    const href = `${ORIGIN}${PATH}`;

    return {
        method: "GET",
        url: href,
        nextUrl: new URL(href),
        headers: new Headers(),
        cookies: { get: () => null },
    } as unknown as NextRequest;
}

async function policyWith(
    overrides: Partial<typeof envMock>
): Promise<Map<string, string[]>> {
    Object.assign(envMock, {
        ARCJET_KEY: undefined,
        NEXT_PUBLIC_API_URL: API_URL,
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: AUTH_DOMAIN,
        ...overrides,
    });

    vi.resetModules();
    const proxy = (await import("@/proxy")).default;
    const response = await proxy(makeRequest());
    const raw =
        response.headers.get("content-security-policy-report-only") ?? "";

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

describe("landing policy sources", () => {
    it("refuses every frame when no auth domain is configured", async () => {
        const policy = await policyWith({
            NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: undefined,
        });

        expect(policy.get("frame-src")).toEqual(["'none'"]);
        expect(policy.get("child-src")).toEqual(["'none'"]);
    });

    it("keeps the directive free of empty entries when no API url is set", async () => {
        const connectSrc =
            (await policyWith({ NEXT_PUBLIC_API_URL: undefined })).get(
                "connect-src"
            ) ?? [];

        expect(connectSrc).toContain("'self'");
        expect(connectSrc).not.toContain("");
    });

    /**
     * The landing mounts no analytics provider, so listing measurement hosts here
     * would widen the policy for scripts that never load.
     */
    it("carries no analytics origin at all", async () => {
        const policy = await policyWith({});

        expect(policy.get("script-src")).not.toContain(
            "https://www.googletagmanager.com"
        );
        expect(policy.get("img-src")).not.toContain(
            "https://lh3.googleusercontent.com"
        );
    });
});
