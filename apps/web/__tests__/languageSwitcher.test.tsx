import { globalTranslations } from "@repo/internationalization/translations/global";
import { locales } from "@repo/internationalization/utils";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { params } = vi.hoisted(() => ({
    params: { locale: "pt-br" } as Record<string, string>,
}));

vi.mock("next/navigation", () => ({
    useParams: () => params,
    usePathname: () => `/${params.locale}`,
    useRouter: () => ({ push: vi.fn() }),
}));

const { LocaleProvider } = await import("@repo/internationalization/client");
const { LanguageSwitcher } = await import(
    "@/app/[locale]/components/header/language-switcher"
);

const SR_ONLY_TEXT = /<span class="sr-only">([^<]*)<\/span>/g;

function screenReaderTexts(html: string): string[] {
    return Array.from(html.matchAll(SR_ONLY_TEXT), ([, text]) => text);
}

describe("LanguageSwitcher da apps/web", () => {
    it.each(locales)("nomeia o gatilho no idioma %s", (locale) => {
        params.locale = locale;

        const html = renderToString(
            <LocaleProvider>
                <LanguageSwitcher />
            </LocaleProvider>
        );

        expect(screenReaderTexts(html)).toEqual([
            globalTranslations[locale].components.languageSwitcher.trigger,
        ]);
    });
});
