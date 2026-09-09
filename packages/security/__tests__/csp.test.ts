import { afterEach, describe, expect, it } from "vitest";
import {
    applySecurityHeaders,
    buildApiOptions,
    buildBrowserAppOptions,
} from "../middleware";

const DIRECTIVE_SEPARATOR = /\s+/;
const MAX_AGE = /max-age=(\d+)/;

const CSP_HEADER = "content-security-policy";
const CSP_REPORT_ONLY_HEADER = "content-security-policy-report-only";

const AUTH_DOMAIN = "https://demo-project.firebaseapp.com";
const API_URL = "https://api.example.com";

function headersFor(
    options: Parameters<typeof applySecurityHeaders>[1],
    reportOnly = false
): Headers {
    const response = new Response(null);
    applySecurityHeaders(response, options, reportOnly);
    return response.headers;
}

function directives(policy: string): Map<string, string[]> {
    const entries = policy
        .split(";")
        .map((chunk) => chunk.trim())
        .filter(Boolean)
        .map((chunk) => {
            const [name, ...sources] = chunk.split(DIRECTIVE_SEPARATOR);
            return [name as string, sources] as const;
        });

    return new Map(entries);
}

function browserDirectives(
    input: Parameters<typeof buildBrowserAppOptions>[0] = {}
): Map<string, string[]> {
    const policy = headersFor(buildBrowserAppOptions(input)).get(CSP_HEADER);
    return directives(policy ?? "");
}

const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
});

describe("browser app policy", () => {
    it("keeps the sign-in popup able to talk back to its opener", () => {
        const headers = headersFor(buildBrowserAppOptions());

        expect(headers.get("cross-origin-opener-policy")).toBe(
            "same-origin-allow-popups"
        );
    });

    it("does not require CORP on cross-origin subresources", () => {
        const headers = headersFor(buildBrowserAppOptions());

        expect(headers.get("cross-origin-embedder-policy")).toBeNull();
    });

    it("allows the Google bridge script the popup loads", () => {
        expect(browserDirectives().get("script-src")).toContain(
            "https://apis.google.com"
        );
    });

    it("frames the Firebase auth domain the popup resolver mounts", () => {
        const resolved = browserDirectives({ frameSrc: [AUTH_DOMAIN] });

        expect(resolved.get("frame-src")).toContain(AUTH_DOMAIN);
        expect(resolved.get("child-src")).toContain(AUTH_DOMAIN);
    });

    it("falls back to none when no frame origin is configured", () => {
        expect(browserDirectives().get("frame-src")).toEqual(["'none'"]);
    });

    it("lets the SDK reach the API base url", () => {
        const resolved = browserDirectives({ connectSrc: [API_URL] });

        expect(resolved.get("connect-src")).toContain(API_URL);
        expect(resolved.get("connect-src")).toContain("'self'");
    });

    it("only lists analytics origins when analytics is configured", () => {
        const withoutAnalytics = browserDirectives();
        const withAnalytics = browserDirectives({
            scriptSrc: ["https://www.googletagmanager.com"],
        });

        expect(withoutAnalytics.get("script-src")).not.toContain(
            "https://www.googletagmanager.com"
        );
        expect(withAnalytics.get("script-src")).toContain(
            "https://www.googletagmanager.com"
        );
    });

    it("refuses to be framed and to have its base url rewritten", () => {
        const resolved = browserDirectives();

        expect(resolved.get("frame-ancestors")).toEqual(["'none'"]);
        expect(resolved.get("base-uri")).toEqual(["'none'"]);
        expect(resolved.get("object-src")).toEqual(["'none'"]);
        expect(resolved.get("form-action")).toEqual(["'self'"]);
    });

    it("keeps inline scripts allowed and never declares a nonce", () => {
        const scriptSrc = browserDirectives().get("script-src") ?? [];

        expect(scriptSrc).toContain("'unsafe-inline'");
        expect(scriptSrc.some((source) => source.startsWith("'nonce-"))).toBe(
            false
        );
    });

    it("allows eval only while the development server is hot reloading", () => {
        process.env.NODE_ENV = "development";
        expect(browserDirectives().get("script-src")).toContain(
            "'unsafe-eval'"
        );

        process.env.NODE_ENV = "production";
        expect(browserDirectives().get("script-src")).not.toContain(
            "'unsafe-eval'"
        );
    });

    it("serves the profile picture host when the app asks for it", () => {
        const imgSrc =
            browserDirectives({
                imgSrc: ["https://lh3.googleusercontent.com"],
            }).get("img-src") ?? [];

        expect(imgSrc).toContain("https://lh3.googleusercontent.com");
        expect(imgSrc).toContain("data:");
        expect(imgSrc).toContain("blob:");
    });

    it("never repeats an origin the app also passes in", () => {
        const scriptSrc =
            browserDirectives({ scriptSrc: ["'self'"] }).get("script-src") ??
            [];

        expect(scriptSrc.filter((source) => source === "'self'")).toHaveLength(
            1
        );
    });
});

describe("api policy", () => {
    it("denies everything it does not need to render its own error page", () => {
        const resolved = directives(
            headersFor(buildApiOptions()).get(CSP_HEADER) ?? ""
        );

        expect(resolved.get("default-src")).toEqual(["'none'"]);
        expect(resolved.get("connect-src")).toEqual(["'none'"]);
        expect(resolved.get("frame-ancestors")).toEqual(["'none'"]);
        expect(resolved.get("form-action")).toEqual(["'none'"]);
        expect(resolved.get("script-src")).toContain("'self'");
        expect(resolved.get("style-src")).toContain("'unsafe-inline'");
    });

    it("stays readable by the front-end origins that call it", () => {
        const headers = headersFor(buildApiOptions());

        expect(headers.get("cross-origin-resource-policy")).toBe(
            "cross-origin"
        );
        expect(headers.get("cross-origin-embedder-policy")).toBeNull();
    });

    it("asks browsers to remember HTTPS for at least a year", () => {
        const hsts =
            headersFor(buildApiOptions()).get("strict-transport-security") ??
            "";
        const maxAge = Number(MAX_AGE.exec(hsts)?.[1]);

        const ONE_YEAR_IN_SECONDS = 31_536_000;
        expect(maxAge).toBeGreaterThanOrEqual(ONE_YEAR_IN_SECONDS);
    });
});

describe("report-only mode", () => {
    it("reports instead of blocking when the app asks for it", () => {
        const headers = headersFor(buildBrowserAppOptions(), true);

        expect(headers.get(CSP_REPORT_ONLY_HEADER)).toContain("default-src");
        expect(headers.get(CSP_HEADER)).toBeNull();
    });

    it("blocks by default", () => {
        const headers = headersFor(buildBrowserAppOptions());

        expect(headers.get(CSP_HEADER)).toContain("default-src");
        expect(headers.get(CSP_REPORT_ONLY_HEADER)).toBeNull();
    });

    it("still sends the non-CSP headers while only reporting", () => {
        const headers = headersFor(buildBrowserAppOptions(), true);

        expect(headers.get("x-content-type-options")).toBe("nosniff");
        expect(headers.get("referrer-policy")).toBe("no-referrer");
    });
});
