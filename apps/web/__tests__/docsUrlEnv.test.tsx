import { globalTranslations } from "@repo/internationalization/translations/global";
import { type Locale, locales } from "@repo/internationalization/utils";
import type { ReactNode } from "react";
import { renderToStaticMarkup, renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { params, getDictionaryMock } = vi.hoisted(() => ({
    params: { locale: "pt-br" } as Record<string, string>,
    getDictionaryMock: vi.fn(),
}));

vi.mock("@repo/auth/provider", () => ({
    default: () => ({
        user: null,
        loading: false,
        signOut: { mutate: vi.fn() },
    }),
}));

vi.mock("@/shared/lib/client", () => ({
    apiClient: { removeHeader: vi.fn() },
}));

vi.mock("@repo/next-config/product-mode", () => ({
    isSubscriptionMode: () => false,
}));

vi.mock("@repo/design-system/hooks/useMediaQuery", () => ({
    useIsLargeDesktop: () => true,
}));

vi.mock("@repo/analytics/consent-context", () => ({
    useCookieConsent: () => ({ available: false, openPreferences: vi.fn() }),
}));

vi.mock("@repo/internationalization/server", () => ({
    getDictionary: () => getDictionaryMock(),
}));

vi.mock("next/navigation", () => ({
    useParams: () => params,
    usePathname: () => `/${params.locale}`,
    useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/link", () => ({
    default: ({
        children,
        ...props
    }: {
        children: ReactNode;
        [prop: string]: unknown;
    }) => <a {...props}>{children}</a>,
}));

const DOCS_URL = "https://docs.example.com";
const DOCS_HREF = `href="${DOCS_URL}"`;
const EXTERNAL_DOCS_LINK =
    /<a[^>]*href="https:\/\/docs\.example\.com"[^>]*rel="noopener noreferrer"[^>]*target="_blank"/;
const TAG = /<[^>]*>/g;

async function loadSurfaces(locale: Locale) {
    params.locale = locale;
    getDictionaryMock.mockResolvedValue({
        dictionary: globalTranslations[locale],
        locale,
    });

    const { env } = await import("@/env");
    const { LocaleProvider } = await import(
        "@repo/internationalization/client"
    );
    const { Header } = await import("@/app/[locale]/components/header");
    const { Footer } = await import("@/app/[locale]/components/footer");

    return {
        env,
        header: renderToString(
            <LocaleProvider>
                <Header />
            </LocaleProvider>
        ),
        footer: renderToStaticMarkup(await Footer()),
    };
}

function docsLinkText(html: string): string | undefined {
    const escapedUrl = DOCS_URL.replaceAll(".", "\\.");
    const link = new RegExp(
        `<a[^>]*href="${escapedUrl}"[^>]*>([\\s\\S]*?)</a>`
    );
    return html.match(link)?.[1]?.replace(TAG, "").trim();
}

beforeEach(() => {
    vi.resetModules();
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("NEXT_PUBLIC_DOCS_URL no env tipado da web", () => {
    it.each(locales)(
        "leva o link de documentação ao header em %s",
        async (locale) => {
            vi.stubEnv("NEXT_PUBLIC_DOCS_URL", DOCS_URL);

            const { env, header } = await loadSurfaces(locale);

            expect(env.NEXT_PUBLIC_DOCS_URL).toBe(DOCS_URL);
            expect(docsLinkText(header)).toBe(
                globalTranslations[locale].components.header.docs
            );
        }
    );

    it.each(locales)(
        "leva o link de documentação ao footer em %s, em aba nova",
        async (locale) => {
            vi.stubEnv("NEXT_PUBLIC_DOCS_URL", DOCS_URL);

            const { footer } = await loadSurfaces(locale);

            expect(docsLinkText(footer)).toBe(
                globalTranslations[locale].components.header.docs
            );
            expect(footer).toMatch(EXTERNAL_DOCS_LINK);
        }
    );

    it("trata o valor vazio do .env.example como ausência", async () => {
        vi.stubEnv("NEXT_PUBLIC_DOCS_URL", "");

        const { env, header, footer } = await loadSurfaces("pt-br");

        expect(env.NEXT_PUBLIC_DOCS_URL).toBeUndefined();
        expect(header).not.toContain(DOCS_HREF);
        expect(footer).not.toContain(DOCS_HREF);
    });

    it("sem a variável, header e footer ficam sem o link", async () => {
        vi.stubEnv("NEXT_PUBLIC_DOCS_URL", undefined);

        const { env, header, footer } = await loadSurfaces("pt-br");

        expect(env.NEXT_PUBLIC_DOCS_URL).toBeUndefined();
        expect(header).not.toContain(DOCS_HREF);
        expect(footer).not.toContain(DOCS_HREF);
        expect(header).toContain("lg:grid-cols-[1fr_minmax(0,auto)_1fr]");
    });
});
