import { globalTranslations } from "@repo/internationalization/translations/global";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
    useParams: () => ({ locale: "pt-br" }),
}));

vi.mock("@/shared/hooks/useListUsers", () => ({
    useListUsers: () => ({ data: [] }),
}));

vi.mock("@repo/design-system/components/ui/select", () => ({
    Select: () => null,
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

const { LocaleProvider } = await import("@repo/internationalization/client");
const { AuditFilters } = await import(
    "@/app/[locale]/(authenticated)/(admin)/admin/(pages)/audit/(components)/AuditFilters"
);

const filtersCopy =
    globalTranslations["pt-br"].apps.app.pages.admin.auditTrail.filters;
const NEXT_MONTH = "Ir para o próximo mês";
const JANUARY_10_2027_DAY_BUTTON = /10 de janeiro de 2027/;
const MONTHS_FROM_OCTOBER_TO_JANUARY = 3;

function renderFilters() {
    const onApply = vi.fn();
    render(
        <LocaleProvider>
            <AuditFilters onApply={onApply} />
        </LocaleProvider>
    );
    return onApply;
}

function openFromCalendar() {
    fireEvent.click(screen.getByLabelText(filtersCopy.fromLabel));
    return screen.getByRole("dialog");
}

beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-13T12:00:00"));
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

describe("filtros de período da auditoria", () => {
    it("abrem o calendário sem seletor de mês e ano", () => {
        renderFilters();

        const calendar = openFromCalendar();

        expect(within(calendar).queryAllByRole("combobox")).toHaveLength(0);
        expect(within(calendar).getByText("outubro 2026")).toBeTruthy();
    });

    it("navegam além do fim do ano corrente e reabrem no mês da data escolhida", async () => {
        const onApply = renderFilters();

        const calendar = openFromCalendar();
        for (let step = 0; step < MONTHS_FROM_OCTOBER_TO_JANUARY; step++) {
            const next = within(calendar).getByRole("button", {
                name: NEXT_MONTH,
            });
            expect(next.hasAttribute("aria-disabled")).toBe(false);
            fireEvent.click(next);
        }
        fireEvent.click(
            within(within(calendar).getByRole("grid")).getByRole("button", {
                name: JANUARY_10_2027_DAY_BUTTON,
            })
        );
        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

        const reopened = openFromCalendar();
        expect(within(reopened).getByText("janeiro 2027")).toBeTruthy();

        fireEvent.keyDown(document.body, { key: "Escape" });
        fireEvent.click(
            screen.getByRole("button", { name: filtersCopy.apply })
        );
        await waitFor(() =>
            expect(onApply).toHaveBeenCalledWith({ from: "2027-01-10" })
        );
    });
});
