import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * O primitivo é substituído por um stub que expõe o `onValueChange` para o teste: o que
 * está sob prova é o contrato do wrapper diante do que o primitivo emite — inclusive o
 * valor vazio que ele reporta enquanto as opções ainda não estão montadas.
 */
vi.mock("@repo/design-system/components/ui/select", () => ({
    Select: ({
        value,
        onValueChange,
    }: {
        value?: string;
        onValueChange?: (next: string) => void;
    }) => (
        <div>
            <output>{value ?? "(vazio)"}</output>
            <button onClick={() => onValueChange?.("")} type="button">
                emitir vazio
            </button>
            <button onClick={() => onValueChange?.("es")} type="button">
                emitir es
            </button>
        </div>
    ),
}));

const { HookFormSelect } = await import(
    "@repo/design-system/components/form/hookform/hookformSelect"
);
const { Form } = await import("@repo/design-system/components/ui/form");

const options = [
    { value: "pt-br", label: "Português" },
    { value: "en", label: "English" },
    { value: "es", label: "Español" },
];

function LocaleForm() {
    const form = useForm<{ locale: string }>({
        defaultValues: { locale: "pt-br" },
    });

    return (
        <Form {...form}>
            <HookFormSelect label="Idioma" name="locale" options={options} />
        </Form>
    );
}

describe("HookFormSelect", () => {
    afterEach(cleanup);

    it("ignora um valor que não é uma das opções", () => {
        render(<LocaleForm />);

        fireEvent.click(screen.getByRole("button", { name: "emitir vazio" }));

        expect(screen.getByRole("status").textContent).toBe("pt-br");
    });

    it("aceita a escolha de uma opção existente", () => {
        render(<LocaleForm />);

        fireEvent.click(screen.getByRole("button", { name: "emitir es" }));

        expect(screen.getByRole("status").textContent).toBe("es");
    });
});
