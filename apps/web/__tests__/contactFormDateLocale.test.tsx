import { globalTranslations } from "@repo/internationalization/translations/global";
import { type Locale, locales } from "@repo/internationalization/utils";
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

const DATE_LABEL_TAG = /<label[^>]*\bfor="date"/;
const DATE_BUTTON_TAG = /<button[^>]*\bid="date"/;

function renderContactForm(locale: Locale) {
    params.locale = locale;
    return renderToString(
        <LocaleProvider>
            <ContactFormClient />
        </LocaleProvider>
    );
}

describe("data do formulário de contato", () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(new Date("2026-10-13T12:00:00"));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it.each(locales)("começa vazia, com o placeholder em %s", (locale) => {
        const html = renderContactForm(locale);

        expect(html).toContain(
            globalTranslations[locale].components.dateInput.placeholder
        );
    });

    it("gera o mesmo HTML em dias diferentes", () => {
        const firstDay = renderContactForm("pt-br");

        vi.setSystemTime(new Date("2026-10-14T12:00:00"));
        const nextDay = renderContactForm("pt-br");

        expect(nextDay).toBe(firstDay);
    });

    it("liga o rótulo Data ao botão do calendário", () => {
        const html = renderContactForm("pt-br");

        expect(html).toMatch(DATE_LABEL_TAG);
        expect(html).toMatch(DATE_BUTTON_TAG);
    });
});
