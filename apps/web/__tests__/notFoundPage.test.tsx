import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const { getDictionaryMock } = vi.hoisted(() => ({
    getDictionaryMock: vi.fn(),
}));

vi.mock("@repo/internationalization/server", () => ({
    getDictionary: () => getDictionaryMock(),
}));

vi.mock("next/link", () => ({
    default: ({
        href,
        children,
        className,
    }: {
        href: string;
        children: unknown;
        className?: string;
    }) => (
        <a className={className} href={href}>
            {children as never}
        </a>
    ),
}));

const { globalTranslations } = await import(
    "@repo/internationalization/translations/global"
);
const { default: NotFound } = await import("@/app/[locale]/not-found");

const ANCHOR_RE = /<a\b[^>]*href="([^"]*)"/g;
const TITLE_RE = /<title>([^<]*)<\/title>/g;

afterEach(() => {
    vi.unstubAllEnvs();
});

async function renderFor(locale: "pt-br" | "en" | "es") {
    getDictionaryMock.mockResolvedValue({
        dictionary: globalTranslations[locale],
        locale,
    });
    return renderToStaticMarkup(await NotFound());
}

describe("landing not-found page", () => {
    it.each(["pt-br", "en", "es"] as const)(
        "renders the %s copy with a way back home",
        async (locale) => {
            const html = await renderFor(locale);
            const copy = globalTranslations[locale].apps.web.pages.notFound;

            expect(html).toContain("<h1");
            expect(html).toContain(copy.title);
            expect(html).toContain(copy.description);
            expect(html).toContain(copy.goHome);

            const hrefs = [...html.matchAll(ANCHOR_RE)].map(
                (match) => match[1]
            );
            expect(hrefs).toEqual([`/${locale}`]);
        }
    );

    it.each(["pt-br", "en", "es"] as const)(
        "names the %s tab after the page and the brand",
        async (locale) => {
            vi.stubEnv("NEXT_PUBLIC_APP_NAME", "Acme");

            const html = await renderFor(locale);
            const copy = globalTranslations[locale].apps.web.pages.notFound;

            const titles = [...html.matchAll(TITLE_RE)].map(
                (match) => match[1]
            );
            expect(titles).toEqual([`${copy.title} | Acme`]);
        }
    );
});
