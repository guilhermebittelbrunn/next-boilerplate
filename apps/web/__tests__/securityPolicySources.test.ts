import type { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

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

afterEach(() => {
    vi.unstubAllEnvs();
});

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

/**
 * A fork that hosts its logo on a CDN would get a violation report for the header mark
 * if the policy did not name that host. A missing or malformed logo value
 * must leave the directive exactly as it was.
 */
describe("image sources follow the brand logo", () => {
    const LOGO_URL = "https://cdn.example.com/brand/logo.png";

    it("names the logo origin once a logo is configured", async () => {
        vi.stubEnv("NEXT_PUBLIC_APP_LOGO_URL", LOGO_URL);

        const imgSrc = (await policyWith({})).get("img-src") ?? [];

        expect(imgSrc).toContain("https://cdn.example.com");
        expect(imgSrc).not.toContain(LOGO_URL);
    });

    it.each([
        "",
        "   ",
        "/logo.png",
        "javascript:alert(1)",
        "ftp://cdn.example.com/l.png",
        "https://x;sandbox/logo.png",
        "https://a,b.com/l.png",
        "https://a'b.com/l.png",
    ])(
        "leaves the directive untouched for the logo value %j",
        async (value) => {
            const baseline = (await policyWith({})).get("img-src");
            vi.stubEnv("NEXT_PUBLIC_APP_LOGO_URL", value);

            const imgSrc = (await policyWith({})).get("img-src");

            expect(imgSrc).toEqual(baseline);
        }
    );

    it("does not let a separator in the logo host open a directive of its own", async () => {
        const baseline = [...(await policyWith({})).keys()];
        vi.stubEnv("NEXT_PUBLIC_APP_LOGO_URL", "https://x;sandbox/logo.png");

        const policy = await policyWith({});

        expect([...policy.keys()]).toEqual(baseline);
        expect(policy.has("sandbox")).toBe(false);
    });

    it("keeps the port of the logo origin", async () => {
        vi.stubEnv(
            "NEXT_PUBLIC_APP_LOGO_URL",
            "https://cdn.example.com:8443/l.png"
        );

        const imgSrc = (await policyWith({})).get("img-src") ?? [];

        expect(imgSrc).toContain("https://cdn.example.com:8443");
    });
});
