import { Calendar } from "@repo/design-system/components/ui/calendar";
import { DateInput } from "@repo/design-system/components/ui/date-input";
import { calendarLocales } from "@repo/design-system/lib/calendar-locales";
import { LocaleProvider } from "@repo/internationalization/client";
import { globalTranslations } from "@repo/internationalization/translations/global";
import { type Locale, locales } from "@repo/internationalization/utils";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    within,
} from "@testing-library/react";
import { parseISO } from "date-fns";
import type { ReactNode } from "react";
import { enUS } from "react-day-picker/locale";
import { afterEach, describe, expect, it, vi } from "vitest";

const { params } = vi.hoisted(() => ({
    params: { locale: "pt-br" } as Record<string, string>,
}));

vi.mock("next/navigation", () => ({
    useParams: () => params,
}));

class NoopObserver {
    observe() {
        return;
    }
    unobserve() {
        return;
    }
    disconnect() {
        return;
    }
}
globalThis.ResizeObserver ??=
    NoopObserver as unknown as typeof globalThis.ResizeObserver;

const OCTOBER_2026 = parseISO("2026-10-01");
const OCTOBER_20_DAY_BUTTON = /20 de outubro de 2026/;

const expected: Record<
    Locale,
    {
        formattedDate: string;
        caption: string;
        previousMonth: string;
        nextMonth: string;
        firstWeekday: string;
        shortOctober: string;
    }
> = {
    "pt-br": {
        formattedDate: "13 de outubro de 2026",
        caption: "outubro 2026",
        previousMonth: "Ir para o mês anterior",
        nextMonth: "Ir para o próximo mês",
        firstWeekday: "domingo",
        shortOctober: "out",
    },
    en: {
        formattedDate: "October 13th, 2026",
        caption: "October 2026",
        previousMonth: "Go to the Previous Month",
        nextMonth: "Go to the Next Month",
        firstWeekday: "Sunday",
        shortOctober: "Oct",
    },
    es: {
        formattedDate: "13 de octubre de 2026",
        caption: "octubre 2026",
        previousMonth: "Ir al mes anterior",
        nextMonth: "Ir al mes siguiente",
        firstWeekday: "lunes",
        shortOctober: "oct",
    },
};

function inLocale(locale: Locale, ui: ReactNode) {
    params.locale = locale;
    return <LocaleProvider>{ui}</LocaleProvider>;
}

function renderInLocale(locale: Locale, ui: ReactNode) {
    return render(inLocale(locale, ui));
}

function dateInputText() {
    return screen.getByRole("button").textContent;
}

afterEach(cleanup);

describe("calendarLocales", () => {
    it("tem um locale do calendário para cada idioma do produto", () => {
        expect(Object.keys(calendarLocales).sort()).toEqual(
            [...locales].sort()
        );
        for (const locale of locales) {
            expect(calendarLocales[locale].labels?.labelNext).toBeTruthy();
        }
    });
});

describe.each(locales)("DateInput em %s", (locale) => {
    it("mostra o placeholder do dicionário sem placeholder do chamador", () => {
        renderInLocale(locale, <DateInput />);

        expect(dateInputText()).toBe(
            globalTranslations[locale].components.dateInput.placeholder
        );
    });

    it("formata a data escolhida no idioma da página", () => {
        renderInLocale(locale, <DateInput value="2026-10-13" />);

        expect(dateInputText()).toBe(expected[locale].formattedDate);
    });
});

describe("DateInput com placeholder do chamador", () => {
    it("mantém o texto do chamador", () => {
        renderInLocale("pt-br", <DateInput placeholder="Data de corte" />);

        expect(dateInputText()).toBe("Data de corte");
    });

    it("mantém um placeholder vazio passado de propósito", () => {
        renderInLocale("pt-br", <DateInput placeholder="" />);

        expect(dateInputText()).toBe("");
    });
});

describe.each(locales)("Calendar em %s", (locale) => {
    it("mostra legenda, navegação e dias da semana no idioma", () => {
        renderInLocale(locale, <Calendar mode="single" month={OCTOBER_2026} />);

        expect(screen.getByText(expected[locale].caption)).toBeTruthy();
        expect(
            screen.getByRole("button", { name: expected[locale].previousMonth })
        ).toBeTruthy();
        expect(
            screen.getByRole("button", { name: expected[locale].nextMonth })
        ).toBeTruthy();
        expect(
            screen
                .getAllByRole("columnheader", { hidden: true })[0]
                ?.getAttribute("aria-label")
        ).toBe(expected[locale].firstWeekday);
    });
});

describe("Calendar", () => {
    it("troca o idioma sem remontar quando a página re-renderiza", () => {
        const { rerender } = renderInLocale(
            "pt-br",
            <Calendar mode="single" month={OCTOBER_2026} />
        );
        expect(screen.getByText(expected["pt-br"].caption)).toBeTruthy();

        rerender(
            inLocale("en", <Calendar mode="single" month={OCTOBER_2026} />)
        );
        expect(screen.getByText(expected.en.caption)).toBeTruthy();

        rerender(
            inLocale("es", <Calendar mode="single" month={OCTOBER_2026} />)
        );
        expect(screen.getByText(expected.es.caption)).toBeTruthy();
    });

    it("deixa um locale passado pelo chamador vencer o idioma da página", () => {
        renderInLocale(
            "pt-br",
            <Calendar locale={enUS} mode="single" month={OCTOBER_2026} />
        );

        expect(screen.getByText(expected.en.caption)).toBeTruthy();
    });

    it("nomeia os meses do seletor no idioma da página", () => {
        renderInLocale(
            "pt-br",
            <Calendar
                captionLayout="dropdown"
                mode="single"
                month={OCTOBER_2026}
            />
        );

        const monthSelect = screen.getByRole("combobox", {
            name: "Escolha o mês",
        });
        const monthNames = within(monthSelect)
            .getAllByRole("option")
            .map((option) => option.textContent);
        expect(monthNames).toContain(expected["pt-br"].shortOctober);
    });
});

describe("DateInput ao escolher um dia", () => {
    it("grava a data como yyyy-MM-dd em qualquer idioma", () => {
        const onChange = vi.fn();
        renderInLocale(
            "pt-br",
            <DateInput onChange={onChange} value="2026-10-13" />
        );

        fireEvent.click(screen.getByRole("button"));
        fireEvent.click(
            screen.getByRole("button", { name: OCTOBER_20_DAY_BUTTON })
        );

        expect(onChange).toHaveBeenCalledWith("2026-10-20");
    });
});
