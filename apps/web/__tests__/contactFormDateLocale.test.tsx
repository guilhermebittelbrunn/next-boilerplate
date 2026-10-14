import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { params } = vi.hoisted(() => ({
    params: { locale: "pt-br" } as Record<string, string>,
}));

vi.mock("next/navigation", () => ({
    useParams: () => params,
    usePathname: () => `/${params.locale}/contact`,
    useRouter: () => ({ push: vi.fn() }),
}));

const { LocaleProvider } = await import("@repo/internationalization/client");
const { ContactFormClient } = await import(
    "@/app/[locale]/contact/components/contact-form-client"
);

describe("data do formulário de contato", () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(new Date("2026-10-13T12:00:00"));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it.each([
        ["pt-br", "13 de outubro de 2026"],
        ["en", "October 13th, 2026"],
        ["es", "13 de octubre de 2026"],
    ])("formata a data do botão no idioma %s", (locale, expected) => {
        params.locale = locale;

        const html = renderToString(
            <LocaleProvider>
                <ContactFormClient />
            </LocaleProvider>
        );

        expect(html).toContain(expected);
    });
});
