import { describe, expect, it } from "vitest";
import { postAuthRedirectTarget } from "../redirect";

const FALLBACK = "/pt-br";

/**
 * This is an open-redirect guard: anything it lets through becomes a post-login
 * navigation target, so every rejection below is a security assertion.
 */
describe("postAuthRedirectTarget", () => {
    it("accepts a locale-prefixed same-origin path", () => {
        expect(postAuthRedirectTarget("/pt-br/entities", FALLBACK)).toBe(
            "/pt-br/entities"
        );
        expect(postAuthRedirectTarget("/en/admin/users", FALLBACK)).toBe(
            "/en/admin/users"
        );
        expect(postAuthRedirectTarget("/es", FALLBACK)).toBe("/es");
    });

    it("rejects a value still percent-encoded, since callers pass it already decoded", () => {
        expect(postAuthRedirectTarget("%2Fpt-br%2Fentities", FALLBACK)).toBe(
            FALLBACK
        );
        expect(postAuthRedirectTarget("%2F%2Fevil.com", FALLBACK)).toBe(
            FALLBACK
        );
    });

    it("keeps an encoded slash, backslash or tab inside the path on the same origin", () => {
        const origin = "https://app.example.com";
        for (const target of [
            "/pt-br/%2F%2Fevil.com",
            "/pt-br/%5C%5Cevil.com",
            "/pt-br/%09/evil.com",
            "/pt-br/..%2F..%2F%2F%2Fevil.com",
        ]) {
            const accepted = postAuthRedirectTarget(target, FALLBACK);
            expect(accepted).toBe(target);
            const destination = new URL(accepted, origin);
            expect(destination.origin).toBe(origin);
            expect(destination.pathname).toBe(target);
        }
    });

    it("keeps encoded characters inside the destination's query intact", () => {
        expect(postAuthRedirectTarget("/pt-br/search?q=a%26b", FALLBACK)).toBe(
            "/pt-br/search?q=a%26b"
        );
        expect(postAuthRedirectTarget("/pt-br/report?v=100%25", FALLBACK)).toBe(
            "/pt-br/report?v=100%25"
        );
        expect(postAuthRedirectTarget("/pt-br/report?v=100%", FALLBACK)).toBe(
            "/pt-br/report?v=100%"
        );
    });

    it("rejects an absolute URL to another origin", () => {
        expect(postAuthRedirectTarget("https://evil.com", FALLBACK)).toBe(
            FALLBACK
        );
        expect(postAuthRedirectTarget("http://evil.com/pt-br", FALLBACK)).toBe(
            FALLBACK
        );
    });

    it("rejects a script URL", () => {
        expect(postAuthRedirectTarget("javascript:alert(1)", FALLBACK)).toBe(
            FALLBACK
        );
        expect(
            postAuthRedirectTarget(
                "/pt-br/x/../../javascript:alert(1)",
                FALLBACK
            )
        ).toBe(FALLBACK);
    });

    it("rejects a protocol-relative URL", () => {
        expect(postAuthRedirectTarget("//evil.com", FALLBACK)).toBe(FALLBACK);
        expect(postAuthRedirectTarget("/\\evil.com", FALLBACK)).toBe(FALLBACK);
        expect(postAuthRedirectTarget("  //evil.com", FALLBACK)).toBe(FALLBACK);
        expect(postAuthRedirectTarget("//evil.com/pt-br", FALLBACK)).toBe(
            FALLBACK
        );
    });

    it("rejects a path smuggling a double slash", () => {
        expect(postAuthRedirectTarget("/pt-br//evil.com", FALLBACK)).toBe(
            FALLBACK
        );
    });

    it("rejects a path the URL parser resolves to a double slash", () => {
        for (const target of [
            "/pt-br/\t/evil.com",
            "/pt-br/\n/evil.com",
            "/pt-br/\r/evil.com",
            "/pt-br/\\evil.com",
            "/pt-br/\\/evil.com",
            "/pt-br/x/\\y",
        ]) {
            expect(postAuthRedirectTarget(target, FALLBACK)).toBe(FALLBACK);
        }
    });

    it("accepts a path that resolves without a double slash", () => {
        expect(postAuthRedirectTarget("/pt-br/", FALLBACK)).toBe("/pt-br/");
        expect(postAuthRedirectTarget("/pt-br/x\t/y", FALLBACK)).toBe(
            "/pt-br/x\t/y"
        );
    });

    it("falls back when the query or hash carries a double slash", () => {
        expect(
            postAuthRedirectTarget("/pt-br/search?next=https://x.com", FALLBACK)
        ).toBe(FALLBACK);
        expect(postAuthRedirectTarget("/pt-br/a#//x", FALLBACK)).toBe(FALLBACK);
    });

    it("rejects a path without a known locale prefix", () => {
        expect(postAuthRedirectTarget("/entities", FALLBACK)).toBe(FALLBACK);
        expect(postAuthRedirectTarget("/fr/entities", FALLBACK)).toBe(FALLBACK);
        expect(postAuthRedirectTarget("/pt-brx/entities", FALLBACK)).toBe(
            FALLBACK
        );
    });

    it("rejects a path whose dot segments climb out of the locale to another host", () => {
        for (const target of [
            "/pt-br/../\\evil.com",
            "/pt-br/%2e%2e/\\evil.com",
            "/pt-br/%2e%2e/%5cevil.com",
            "/pt-br/..\\\\evil.com",
            "/pt-br/../\t/evil.com",
            "/pt-br/x/../../\\evil.com",
            "%2Fpt-br%2F..%2F%5Cevil.com",
            "%2Fpt-br%2F%252e%252e%2F%255cevil.com",
        ]) {
            expect(postAuthRedirectTarget(target, FALLBACK)).toBe(FALLBACK);
        }
    });

    it("rejects a path whose dot segments leave every locale", () => {
        expect(postAuthRedirectTarget("/pt-br/..", FALLBACK)).toBe(FALLBACK);
        expect(postAuthRedirectTarget("/pt-br/../entities", FALLBACK)).toBe(
            FALLBACK
        );
    });

    it("accepts dot segments that stay inside a locale, returning the path unchanged", () => {
        expect(postAuthRedirectTarget("/pt-br/x/../entities", FALLBACK)).toBe(
            "/pt-br/x/../entities"
        );
        expect(postAuthRedirectTarget("/pt-br/../en/entities", FALLBACK)).toBe(
            "/pt-br/../en/entities"
        );
    });

    it("keeps the query of an accepted deep link", () => {
        expect(
            postAuthRedirectTarget(
                "/pt-br/account?tab=billing&plan=price_1",
                FALLBACK
            )
        ).toBe("/pt-br/account?tab=billing&plan=price_1");
    });

    it("rejects a relative path", () => {
        expect(postAuthRedirectTarget("entities", FALLBACK)).toBe(FALLBACK);
        expect(postAuthRedirectTarget("../pt-br", FALLBACK)).toBe(FALLBACK);
    });

    it("falls back on empty or malformed input", () => {
        expect(postAuthRedirectTarget(null, FALLBACK)).toBe(FALLBACK);
        expect(postAuthRedirectTarget("", FALLBACK)).toBe(FALLBACK);
        expect(postAuthRedirectTarget("%E0%A4%A", FALLBACK)).toBe(FALLBACK);
    });
});
