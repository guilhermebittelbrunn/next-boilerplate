import { globalTranslations } from "@repo/internationalization/translations/global";
import { locales } from "@repo/internationalization/utils";
import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { params } = vi.hoisted(() => ({
    params: { locale: "pt-br" } as Record<string, string>,
}));

vi.mock("@repo/auth/provider", () => ({
    default: () => ({
        user: null,
        loading: false,
        signOut: { mutate: vi.fn() },
    }),
}));

vi.mock("@/env", () => ({
    env: { NEXT_PUBLIC_APP_URL: undefined, NEXT_PUBLIC_DOCS_URL: undefined },
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

const { LocaleProvider } = await import("@repo/internationalization/client");
const { Header } = await import("@/app/[locale]/components/header");

const BUTTON = /<button(\s[^>]*)?>([\s\S]*?)<\/button>/g;
const ARIA_LABEL = /\saria-label="([^"]*)"/;
const ARIA_EXPANDED = /\saria-expanded="([^"]*)"/;
const TAG = /<[^>]*>/g;

type RenderedButton = {
    label: string | undefined;
    expanded: string | undefined;
    text: string;
};

function renderHeader(locale: string): string {
    params.locale = locale;
    return renderToString(
        <LocaleProvider>
            <Header />
        </LocaleProvider>
    );
}

function buttonsOf(html: string): RenderedButton[] {
    return Array.from(html.matchAll(BUTTON), ([, attributes = "", body]) => ({
        label: attributes.match(ARIA_LABEL)?.[1],
        expanded: attributes.match(ARIA_EXPANDED)?.[1],
        text: body.replace(TAG, "").trim(),
    }));
}

describe("botão do menu do header da web", () => {
    it.each(locales)("tem nome e estado fechado em %s", (locale) => {
        const menuLabel = globalTranslations[locale].components.header.menu;

        const menuButtons = buttonsOf(renderHeader(locale)).filter(
            (button) => button.label !== undefined && button.label === menuLabel
        );

        expect(menuButtons).toHaveLength(1);
        expect(menuButtons[0].expanded).toBe("false");
    });

    it("usa o rótulo de cada idioma", () => {
        expect(
            locales.map(
                (locale) => globalTranslations[locale].components.header.menu
            )
        ).toEqual(["Menu", "Menu", "Menú"]);
    });

    it.each(locales)("nenhum botão do header fica sem nome em %s", (locale) => {
        const buttons = buttonsOf(renderHeader(locale));

        expect(buttons.length).toBeGreaterThan(0);
        expect(
            buttons.filter((button) => !(button.label || button.text))
        ).toEqual([]);
    });
});
