import { DateInput } from "@repo/design-system/components/ui/date-input";
import { LocaleProvider } from "@repo/internationalization/client";
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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

const APRIL_17_1990_DAY_BUTTON = /17 de abril de 1990/;
const OCTOBER_17_1990_DAY_BUTTON = /17 de outubro de 1990/;
const YEARS_FROM_A_CENTURY_AGO_TO_THIS_YEAR = 101;

const april1990Caption: Record<Locale, string> = {
    "pt-br": "abr",
    en: "Apr",
    es: "abr",
};

const dropdownNames: Record<Locale, { month: string; year: string }> = {
    "pt-br": { month: "Escolha o mês", year: "Escolha o ano" },
    en: { month: "Choose the Month", year: "Choose the Year" },
    es: { month: "Elegir el mes", year: "Elegir el año" },
};

function inLocale(locale: Locale, ui: ReactNode) {
    params.locale = locale;
    return <LocaleProvider>{ui}</LocaleProvider>;
}

function renderInLocale(locale: Locale, ui: ReactNode) {
    return render(inLocale(locale, ui));
}

function openCalendar() {
    fireEvent.click(screen.getByRole("button"));
}

function yearOptions() {
    return within(
        screen.getByRole("combobox", { name: dropdownNames["pt-br"].year })
    )
        .getAllByRole("option")
        .map((option) => option.textContent);
}

beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-13T12:00:00"));
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

describe("DateInput abre no mês certo", () => {
    it("abre no mês da data selecionada", () => {
        renderInLocale("pt-br", <DateInput value="1990-04-17" />);

        openCalendar();

        expect(screen.getByText("abril 1990")).toBeTruthy();
        expect(
            within(screen.getByRole("grid")).getByRole("button", {
                name: APRIL_17_1990_DAY_BUTTON,
            })
        ).toBeTruthy();
    });

    it("abre no mês atual sem data selecionada", () => {
        renderInLocale("pt-br", <DateInput />);

        openCalendar();

        expect(screen.getByText("outubro 2026")).toBeTruthy();
    });

    it("reabre no mês da nova data depois de trocar o valor", () => {
        const { rerender } = renderInLocale(
            "pt-br",
            <DateInput value="1990-04-17" />
        );
        openCalendar();
        expect(screen.getByText("abril 1990")).toBeTruthy();

        fireEvent.keyDown(document.body, { key: "Escape" });
        expect(screen.queryByText("abril 1990")).toBeNull();

        rerender(inLocale("pt-br", <DateInput value="2001-09-11" />));
        openCalendar();

        expect(screen.getByText("setembro 2001")).toBeTruthy();
    });

    it("abre no mês atual quando o valor não está no formato yyyy-MM-dd", () => {
        renderInLocale("pt-br", <DateInput value="17/04/1990" />);

        openCalendar();

        expect(screen.getByText("outubro 2026")).toBeTruthy();
    });

    it("mantém a navegação mês a mês e sem limite sem captionLayout", () => {
        renderInLocale("pt-br", <DateInput value="2030-06-15" />);

        openCalendar();

        expect(screen.queryAllByRole("combobox")).toHaveLength(0);
        expect(screen.getByText("junho 2030")).toBeTruthy();
        expect(
            screen
                .getByRole("button", { name: "Ir para o próximo mês" })
                .hasAttribute("aria-disabled")
        ).toBe(false);
    });
});

describe("DateInput com seletor de mês e ano", () => {
    it("posiciona os seletores na data e cobre cem anos até o ano corrente", () => {
        renderInLocale(
            "pt-br",
            <DateInput captionLayout="dropdown" value="1990-04-17" />
        );

        openCalendar();

        const monthSelect = screen.getByRole("combobox", {
            name: dropdownNames["pt-br"].month,
        }) as HTMLSelectElement;
        const yearSelect = screen.getByRole("combobox", {
            name: dropdownNames["pt-br"].year,
        }) as HTMLSelectElement;
        expect(monthSelect.selectedOptions[0]?.textContent).toBe("abr");
        expect(yearSelect.value).toBe("1990");

        const years = yearOptions();
        expect(years).toHaveLength(YEARS_FROM_A_CENTURY_AGO_TO_THIS_YEAR);
        expect(years[0]).toBe("1926");
        expect(years.at(-1)).toBe("2026");
    });

    it.each(locales)(
        "posiciona os seletores em abril de 1990 no idioma %s",
        (locale) => {
            renderInLocale(
                locale,
                <DateInput captionLayout="dropdown" value="1990-04-17" />
            );

            openCalendar();

            const monthSelect = screen.getByRole("combobox", {
                name: dropdownNames[locale].month,
            }) as HTMLSelectElement;
            const yearSelect = screen.getByRole("combobox", {
                name: dropdownNames[locale].year,
            }) as HTMLSelectElement;
            expect(monthSelect.selectedOptions[0]?.textContent).toBe(
                april1990Caption[locale]
            );
            expect(yearSelect.value).toBe("1990");
        }
    );

    it.each(locales)("nomeia os seletores no idioma %s", (locale) => {
        renderInLocale(locale, <DateInput captionLayout="dropdown" />);

        openCalendar();

        expect(
            screen.getByRole("combobox", { name: dropdownNames[locale].month })
        ).toBeTruthy();
        expect(
            screen.getByRole("combobox", { name: dropdownNames[locale].year })
        ).toBeTruthy();
    });

    it("limita o seletor de ano a startMonth e endMonth", () => {
        renderInLocale(
            "pt-br",
            <DateInput
                captionLayout="dropdown"
                endMonth={parseISO("2030-12-31")}
                startMonth={parseISO("2020-01-01")}
            />
        );

        openCalendar();

        expect(yearOptions()).toEqual([
            "2020",
            "2021",
            "2022",
            "2023",
            "2024",
            "2025",
            "2026",
            "2027",
            "2028",
            "2029",
            "2030",
        ]);
    });

    it("grava yyyy-MM-dd ao escolher o dia depois de trocar o ano", () => {
        const onChange = vi.fn();
        renderInLocale(
            "pt-br",
            <DateInput captionLayout="dropdown" onChange={onChange} />
        );

        openCalendar();
        fireEvent.change(
            screen.getByRole("combobox", {
                name: dropdownNames["pt-br"].year,
            }),
            { target: { value: "1990" } }
        );
        fireEvent.click(
            screen.getByRole("button", { name: OCTOBER_17_1990_DAY_BUTTON })
        );

        expect(onChange).toHaveBeenCalledWith("1990-10-17");
    });
});
