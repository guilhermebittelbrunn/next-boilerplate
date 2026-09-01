import { locales } from "@repo/internationalization/utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildLocaleMetadata, getWebBaseUrl } from "@/shared/lib/seo";

/**
 * `seo.ts` decide a URL canônica e as hreflang da landing. Quando ele erra, nada
 * quebra na tela: o site só some do índice do buscador ou passa a apontar o
 * canonical para o domínio errado. Por isso a precedência das envs e o conjunto
 * exato de `alternates.languages` são fixados aqui.
 */

const LOCALHOST_FALLBACK = "http://localhost:3001";

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("getWebBaseUrl", () => {
    it("prefers NEXT_PUBLIC_WEB_URL over the Vercel production host", () => {
        vi.stubEnv("NEXT_PUBLIC_WEB_URL", "https://from-web-url.example");
        vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "from-vercel.example");

        expect(getWebBaseUrl()).toBe("https://from-web-url.example");
    });

    it("falls back to the Vercel production host", () => {
        vi.stubEnv("NEXT_PUBLIC_WEB_URL", "");
        vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "from-vercel.example");

        expect(getWebBaseUrl()).toBe("https://from-vercel.example");
    });

    it("falls back to localhost when neither env is set", () => {
        vi.stubEnv("NEXT_PUBLIC_WEB_URL", "");
        vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");

        expect(getWebBaseUrl()).toBe(LOCALHOST_FALLBACK);
    });

    it("prefixes https when the env value has no protocol", () => {
        vi.stubEnv("NEXT_PUBLIC_WEB_URL", "no-protocol.example");

        expect(getWebBaseUrl()).toBe("https://no-protocol.example");
    });

    it("keeps an explicit http protocol", () => {
        vi.stubEnv("NEXT_PUBLIC_WEB_URL", "http://insecure.example");

        expect(getWebBaseUrl()).toBe("http://insecure.example");
    });

    it("strips trailing slashes and surrounding whitespace", () => {
        vi.stubEnv("NEXT_PUBLIC_WEB_URL", "  https://trailing.example///  ");

        expect(getWebBaseUrl()).toBe("https://trailing.example");
    });
});

describe("buildLocaleMetadata", () => {
    const meta = { title: "Pricing", description: "Plans and pricing" };

    it("emits one hreflang per supported locale plus x-default", () => {
        vi.stubEnv("NEXT_PUBLIC_DEFAULT_LOCALE", "pt-br");

        const metadata = buildLocaleMetadata({
            meta,
            locale: "en",
            path: "/pricing",
        });

        expect(
            Object.keys(metadata.alternates?.languages ?? {}).sort()
        ).toEqual(["en", "es", "pt-br", "x-default"]);
        expect(Object.keys(metadata.alternates?.languages ?? {})).toHaveLength(
            locales.length + 1
        );
    });

    it("points each hreflang at the same path under its own locale", () => {
        const metadata = buildLocaleMetadata({
            meta,
            locale: "es",
            path: "/pricing",
        });

        expect(metadata.alternates?.languages).toMatchObject({
            "pt-br": "/pt-br/pricing",
            en: "/en/pricing",
            es: "/es/pricing",
        });
    });

    it("makes the canonical follow the rendered locale", () => {
        const metadata = buildLocaleMetadata({
            meta,
            locale: "es",
            path: "/pricing",
        });

        expect(metadata.alternates?.canonical).toBe("/es/pricing");
    });

    it("sends x-default to the configured default locale", () => {
        vi.stubEnv("NEXT_PUBLIC_DEFAULT_LOCALE", "en");

        const metadata = buildLocaleMetadata({
            meta,
            locale: "es",
            path: "/pricing",
        });

        expect(metadata.alternates?.languages?.["x-default"]).toBe(
            "/en/pricing"
        );
    });

    it("defaults the path to the locale root", () => {
        vi.stubEnv("NEXT_PUBLIC_DEFAULT_LOCALE", "pt-br");

        const metadata = buildLocaleMetadata({ meta, locale: "pt-br" });

        expect(metadata.alternates?.canonical).toBe("/pt-br");
        expect(metadata.alternates?.languages?.["x-default"]).toBe("/pt-br");
    });

    it.each([
        ["pt-br", "pt_BR"],
        ["en", "en_US"],
        ["es", "es_ES"],
    ])("maps the %s locale to the %s Open Graph locale", (locale, expected) => {
        const metadata = buildLocaleMetadata({ meta, locale });

        expect(metadata.openGraph?.locale).toBe(expected);
    });

    it("falls back to en_US for an unsupported locale", () => {
        const metadata = buildLocaleMetadata({ meta, locale: "de" });

        expect(metadata.openGraph?.locale).toBe("en_US");
    });
});
