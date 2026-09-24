import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
    useRouter: () => ({ back: vi.fn() }),
}));

vi.mock("@repo/internationalization/client", () => ({
    getDictionary: () => ({
        dictionary: {
            components: { footer: { back: "Voltar", confirm: "Confirmar" } },
        },
        locale: "pt-br",
    }),
}));

const { Footer } = await import("@/shared/components/ui/Footer");
const { PageFormFooter } = await import(
    "@/shared/components/ui/PageFormFooter"
);

afterEach(cleanup);

function submitButtonOf(container: HTMLElement): HTMLButtonElement {
    const button = container.querySelector<HTMLButtonElement>(
        'button[type="submit"]'
    );
    if (!button) {
        throw new Error("No submit button rendered");
    }
    return button;
}

/**
 * `Button` applies `disabled={loading}` before spreading the props it was given, so a
 * footer that passes both props loses the loading lock unless it merges them itself.
 * These cover the merge, not the button.
 */
describe("rodapés compartilhados durante o request", () => {
    it("o Footer bloqueia o envio enquanto carrega", () => {
        const { container } = render(<Footer isLoading />);

        expect(submitButtonOf(container).disabled).toBe(true);
    });

    it("o Footer segue clicável quando não está carregando", () => {
        const { container } = render(<Footer />);

        expect(submitButtonOf(container).disabled).toBe(false);
    });

    it("o PageFormFooter bloqueia o envio enquanto carrega", () => {
        const { container } = render(
            <PageFormFooter
                cancelLabel="Cancelar"
                isSubmitting
                onCancel={vi.fn()}
                submitLabel="Salvar"
            />
        );

        expect(submitButtonOf(container).disabled).toBe(true);
    });

    it("o PageFormFooter segue clicável quando não está enviando", () => {
        const { container } = render(
            <PageFormFooter
                cancelLabel="Cancelar"
                onCancel={vi.fn()}
                submitLabel="Salvar"
            />
        );

        expect(submitButtonOf(container).disabled).toBe(false);
    });

    it("o disabled explícito continua valendo sem carregamento", () => {
        const { container } = render(
            <PageFormFooter
                cancelLabel="Cancelar"
                onCancel={vi.fn()}
                submitDisabled
                submitLabel="Salvar"
            />
        );

        expect(submitButtonOf(container).disabled).toBe(true);
    });
});
