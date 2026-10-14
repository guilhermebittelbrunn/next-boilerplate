import { Form } from "@repo/design-system/components/ui/form";
import { EntityType } from "@repo/sdk/src/types";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    type EntityFormValues,
    entityGenreUnset,
} from "@/app/[locale]/(authenticated)/(common)/(pages)/entities/(validations)/entityFormSchema";

vi.mock("next/navigation", () => ({
    useParams: () => ({ locale: "pt-br" }),
}));
vi.mock("@/shared/lib/storageEnabled", () => ({
    isStorageEnabled: () => false,
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
const { EntityFormFields } = await import(
    "@/app/[locale]/(authenticated)/(common)/(pages)/entities/(components)/EntityFormFields"
);

function EntityForm({ birthdate }: { birthdate: string }) {
    const form = useForm<EntityFormValues>({
        defaultValues: {
            name: "",
            description: "",
            type: EntityType.CUSTOMER,
            photo: "",
            genre: entityGenreUnset,
            birthdate,
            enabled: true,
        },
    });

    return (
        <LocaleProvider>
            <Form {...form}>
                <form>
                    <EntityFormFields mode="create" />
                </form>
            </Form>
        </LocaleProvider>
    );
}

function openBirthdateCalendar() {
    fireEvent.click(screen.getByLabelText("Data de nascimento"));
}

beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-13T12:00:00"));
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

describe("campo de data de nascimento de entity", () => {
    it("abre com os seletores de mês e ano", () => {
        render(<EntityForm birthdate="" />);

        openBirthdateCalendar();

        expect(
            screen.getByRole("combobox", { name: "Escolha o mês" })
        ).toBeTruthy();
        expect(
            screen.getByRole("combobox", { name: "Escolha o ano" })
        ).toHaveProperty("value", "2026");
    });

    it("posiciona o seletor de ano na data já preenchida", () => {
        render(<EntityForm birthdate="1990-04-17" />);

        openBirthdateCalendar();

        expect(
            screen.getByRole("combobox", { name: "Escolha o ano" })
        ).toHaveProperty("value", "1990");
    });
});
