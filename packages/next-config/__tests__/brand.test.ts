import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_BRAND_NAME, getBrand, getBrandLogoOrigin } from "../brand";

afterEach(() => {
    vi.unstubAllEnvs();
});

const stubBrand = (vars: Record<string, string | undefined>) => {
    for (const [name, value] of Object.entries(vars)) {
        vi.stubEnv(name, value);
    }
};

describe("getBrand without configuration", () => {
    it("falls back to the neutral defaults when nothing is set", () => {
        stubBrand({
            NEXT_PUBLIC_APP_NAME: undefined,
            NEXT_PUBLIC_APP_LOGO_URL: undefined,
            NEXT_PUBLIC_APP_SUPPORT_EMAIL: undefined,
            NEXT_PUBLIC_WEB_URL: undefined,
        });

        expect(getBrand()).toEqual({
            name: DEFAULT_BRAND_NAME,
            isDefaultName: true,
            logoUrl: null,
            supportEmail: null,
            siteUrl: null,
        });
    });

    it.each(["", "   "])(
        "treats %j, the way the example env files ship, as absent",
        (value) => {
            stubBrand({
                NEXT_PUBLIC_APP_NAME: value,
                NEXT_PUBLIC_APP_LOGO_URL: value,
                NEXT_PUBLIC_APP_SUPPORT_EMAIL: value,
                NEXT_PUBLIC_WEB_URL: value,
            });

            expect(getBrand()).toEqual({
                name: DEFAULT_BRAND_NAME,
                isDefaultName: true,
                logoUrl: null,
                supportEmail: null,
                siteUrl: null,
            });
        }
    );
});

describe("brand name", () => {
    it("uses the configured name without the surrounding spaces", () => {
        stubBrand({ NEXT_PUBLIC_APP_NAME: "  QA Brand  " });

        expect(getBrand().name).toBe("QA Brand");
        expect(getBrand().isDefaultName).toBe(false);
    });

    it("reads the env on every call instead of freezing it at import", () => {
        stubBrand({ NEXT_PUBLIC_APP_NAME: "First" });
        expect(getBrand().name).toBe("First");

        stubBrand({ NEXT_PUBLIC_APP_NAME: "Second" });
        expect(getBrand().name).toBe("Second");
    });
});

describe("brand logo", () => {
    it.each([
        "https://cdn.example.com/logo.png",
        "http://localhost:3001/icon.png",
    ])("accepts the absolute url %s", (value) => {
        stubBrand({ NEXT_PUBLIC_APP_LOGO_URL: value });

        expect(getBrand().logoUrl).toBe(value);
    });

    it("trims the configured url", () => {
        stubBrand({
            NEXT_PUBLIC_APP_LOGO_URL: "  https://cdn.example.com/logo.png ",
        });

        expect(getBrand().logoUrl).toBe("https://cdn.example.com/logo.png");
    });

    it.each([
        "/logo.png",
        "logo.png",
        "javascript:alert(1)",
        "data:image/png;base64,AAAA",
        "ftp://cdn.example.com/logo.png",
        "not a url",
        "https://x;sandbox/logo.png",
        "https://a;b.com/logo.png",
        "https://a,b.com/l.png",
        "https://a'b.com/l.png",
        "https://a*b.com/l.png",
    ])("discards %s", (value) => {
        stubBrand({ NEXT_PUBLIC_APP_LOGO_URL: value });

        expect(getBrand().logoUrl).toBeNull();
        expect(getBrandLogoOrigin()).toBeNull();
    });

    it.each([
        ["https://cdn.example.com:8443/l.png", "https://cdn.example.com:8443"],
        ["https://[::1]:8443/l.png", "https://[::1]:8443"],
        ["https://bücher.example/l.png", "https://xn--bcher-kva.example"],
        [
            "https://firebasestorage.googleapis.com/v0/b/demo/o/logo.png?alt=media",
            "https://firebasestorage.googleapis.com",
        ],
    ])("keeps the origin of %s as %s", (value, expected) => {
        stubBrand({ NEXT_PUBLIC_APP_LOGO_URL: value });

        expect(getBrandLogoOrigin()).toBe(expected);
    });

    it("exposes the origin of a valid logo for the image policy", () => {
        stubBrand({
            NEXT_PUBLIC_APP_LOGO_URL: "https://cdn.example.com/brand/logo.png",
        });

        expect(getBrandLogoOrigin()).toBe("https://cdn.example.com");
    });
});

describe("support email", () => {
    it("keeps a well-formed address, trimmed", () => {
        stubBrand({
            NEXT_PUBLIC_APP_SUPPORT_EMAIL: " qa-brand-config@example.com ",
        });

        expect(getBrand().supportEmail).toBe("qa-brand-config@example.com");
    });

    it.each(["sem-arroba", "a@b", "two words@example.com"])(
        "treats %s as absent",
        (value) => {
            stubBrand({ NEXT_PUBLIC_APP_SUPPORT_EMAIL: value });

            expect(getBrand().supportEmail).toBeNull();
        }
    );
});

describe("site url", () => {
    it.each([
        ["https://example.com/", "https://example.com"],
        ["https://example.com///", "https://example.com"],
        ["example.com", "https://example.com"],
        ["http://localhost:3001", "http://localhost:3001"],
    ])("normalizes %s to %s", (value, expected) => {
        stubBrand({ NEXT_PUBLIC_WEB_URL: value });

        expect(getBrand().siteUrl).toBe(expected);
    });
});
