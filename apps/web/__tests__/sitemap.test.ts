import { readdirSync } from "node:fs";
import { join, sep } from "node:path";
import type { Metadata } from "next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getDictionaryMock } = vi.hoisted(() => ({
    getDictionaryMock: vi.fn(),
}));

vi.mock("@repo/internationalization/server", () => ({
    getDictionary: () => getDictionaryMock(),
}));

vi.mock("@/app/[locale]/sign-in/components/sign-in-form", () => ({
    SignInForm: () => null,
}));

vi.mock("@/app/[locale]/sign-up/components/sign-up-form", () => ({
    SignUpForm: () => null,
}));

const { globalTranslations } = await import(
    "@repo/internationalization/translations/global"
);
const { locales } = await import("@repo/internationalization/utils");
const { default: sitemap } = await import("@/app/sitemap");

const BASE_URL = "https://landing.example";
const LOCALE_DIR = join(__dirname, "../app/[locale]");

const NON_INDEXABLE_PAGES: Record<
    string,
    () => Promise<{ generateMetadata: () => Promise<Metadata> }>
> = {
    "/sign-in": () => import("@/app/[locale]/sign-in/page"),
    "/sign-up": () => import("@/app/[locale]/sign-up/page"),
};

/**
 * Every `page.tsx` under `app/[locale]`, as the path a visitor types after the locale.
 * Route groups do not reach the URL, and dynamic segments are skipped: `[...rest]` is
 * the 404, and a public dynamic route would need a sitemap built from its data.
 */
const discoverPagePaths = () =>
    readdirSync(LOCALE_DIR, { recursive: true, encoding: "utf8" })
        .filter(
            (file) => file === "page.tsx" || file.endsWith(`${sep}page.tsx`)
        )
        .map((file) => file.split(sep).slice(0, -1))
        .filter(
            (segments) => !segments.some((segment) => segment.startsWith("["))
        )
        .map((segments) =>
            segments.filter((segment) => !segment.startsWith("("))
        )
        .map((segments) => (segments.length ? `/${segments.join("/")}` : ""))
        .sort();

const splitLocale = (url: string) => {
    const [, locale = "", ...rest] = new URL(url).pathname.split("/");
    return { locale, path: rest.length ? `/${rest.join("/")}` : "" };
};

const sitemapPathsFor = (locale: string) =>
    sitemap()
        .map((entry) => splitLocale(entry.url))
        .filter((entry) => entry.locale === locale)
        .map((entry) => entry.path)
        .sort();

beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_WEB_URL", BASE_URL);
});

afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
});

describe("landing sitemap", () => {
    it.each(locales)(
        "lists exactly the indexable pages of app/[locale] in %s",
        (locale) => {
            const indexablePaths = discoverPagePaths().filter(
                (path) => !(path in NON_INDEXABLE_PAGES)
            );

            expect(sitemapPathsFor(locale)).toEqual(indexablePaths);
        }
    );

    it("excludes only pages that exist", () => {
        expect(discoverPagePaths()).toEqual(
            expect.arrayContaining(Object.keys(NON_INDEXABLE_PAGES))
        );
    });

    it.each(Object.keys(NON_INDEXABLE_PAGES))(
        "keeps %s out of the sitemap because the page asks not to be indexed",
        async (path) => {
            getDictionaryMock.mockResolvedValue({
                dictionary: globalTranslations["pt-br"],
                locale: "pt-br",
            });
            const page = await NON_INDEXABLE_PAGES[path]();

            const metadata = await page.generateMetadata();

            expect(metadata.robots).toMatchObject({ index: false });
            expect(
                sitemap().some((entry) =>
                    new URL(entry.url).pathname.endsWith(path)
                )
            ).toBe(false);
        }
    );

    it("gives every entry an absolute URL and its alternate in each locale", () => {
        for (const entry of sitemap()) {
            const { path } = splitLocale(entry.url);

            expect(entry.url.startsWith(`${BASE_URL}/`)).toBe(true);
            expect(entry.alternates?.languages).toEqual(
                Object.fromEntries(
                    locales.map((locale) => [
                        locale,
                        `${BASE_URL}/${locale}${path}`,
                    ])
                )
            );
        }
    });

    it("does not depend on the time it is generated", () => {
        vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
        const first = sitemap();
        vi.setSystemTime(new Date("2026-06-30T12:00:00Z"));
        const second = sitemap();

        expect(second).toEqual(first);
        expect(first.every((entry) => entry.lastModified === undefined)).toBe(
            true
        );
    });
});
