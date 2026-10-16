import { describe, expect, it } from "vitest";
import { withRedirectQuery } from "@/shared/lib/authRedirectLink";

describe("withRedirectQuery", () => {
    it("carries a same-origin, locale-prefixed destination, query included", () => {
        expect(
            withRedirectQuery(
                "/pt-br/sign-in",
                "/pt-br/account?tab=billing&plan=price_1"
            )
        ).toBe(
            "/pt-br/sign-in?redirect=%2Fpt-br%2Faccount%3Ftab%3Dbilling%26plan%3Dprice_1"
        );
    });

    it("leaves the link bare without a destination", () => {
        for (const missing of [null, undefined, ""]) {
            expect(withRedirectQuery("/en/sign-up", missing)).toBe(
                "/en/sign-up"
            );
        }
    });

    it("drops a destination that fails the open-redirect guard", () => {
        for (const unsafe of [
            "https://evil.example.com",
            "//evil.example.com",
            "/\\evil.example.com",
            "/no-locale/path",
        ]) {
            expect(withRedirectQuery("/es/sign-in", unsafe)).toBe(
                "/es/sign-in"
            );
        }
    });
});
