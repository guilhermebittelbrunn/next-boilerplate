import { LocaleProvider } from "@repo/internationalization/client";
import { globalTranslations } from "@repo/internationalization/translations/global";
import { type Locale, locales } from "@repo/internationalization/utils";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { params } = vi.hoisted(() => ({
    params: { locale: "pt-br" } as Record<string, string>,
}));

vi.mock("next/navigation", () => ({
    useParams: () => params,
    usePathname: () => `/${params.locale}/entities`,
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

const { LanguageSwitcher } = await import(
    "@/shared/components/ui/LanguageSwitcher"
);
const { default: PageBreadcrumb } = await import(
    "@/shared/components/ui/PageBreadcrumb"
);

function renderInLocale(locale: Locale, ui: ReactNode) {
    params.locale = locale;
    return render(<LocaleProvider>{ui}</LocaleProvider>);
}

afterEach(cleanup);

describe("copy dos componentes compartilhados da apps/app", () => {
    it.each(locales)("nomeia o seletor de idioma em %s", (locale) => {
        renderInLocale(locale, <LanguageSwitcher />);

        expect(
            screen.getByRole("button", {
                name: new RegExp(
                    globalTranslations[locale].components.languageSwitcher
                        .trigger
                ),
            })
        ).toBeTruthy();
    });

    it.each(locales)("leva o breadcrumb de página à home de %s", (locale) => {
        renderInLocale(locale, <PageBreadcrumb pageTitle="Entidades" />);

        const homeLink = screen.getByRole("link", {
            name: globalTranslations[locale].apps.app.pages.common.routes.home,
        });

        expect(homeLink.getAttribute("href")).toBe(`/${locale}`);
    });
});
