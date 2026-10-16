import { postAuthRedirectTarget } from "@repo/auth/redirect";
import { describe, expect, it } from "vitest";

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

    it("accepts a percent-encoded path", () => {
        expect(postAuthRedirectTarget("%2Fpt-br%2Fentities", FALLBACK)).toBe(
            "/pt-br/entities"
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

    it("rejects a protocol-relative URL", () => {
        expect(postAuthRedirectTarget("//evil.com", FALLBACK)).toBe(FALLBACK);
        expect(postAuthRedirectTarget("//evil.com/pt-br", FALLBACK)).toBe(
            FALLBACK
        );
    });

    it("rejects a path smuggling a double slash", () => {
        expect(postAuthRedirectTarget("/pt-br//evil.com", FALLBACK)).toBe(
            FALLBACK
        );
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
                "%2Fpt-br%2Faccount%3Ftab%3Dbilling%26plan%3Dprice_1",
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
