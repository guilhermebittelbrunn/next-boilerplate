import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
    useRouter: () => ({ back: vi.fn() }),
}));

vi.mock("@repo/internationalization/client", () => ({
    getDictionary: () => ({
        dictionary: {
            components: {
                footer: { back: "Voltar", confirm: "Confirmar" },
                spinner: { loading: "Carregando" },
            },
        },
        locale: "pt-br",
    }),
}));

vi.mock("@repo/design-system/components/ui/sidebar", () => ({
    SidebarTrigger: () => null,
}));
vi.mock("@repo/design-system/components/ui/mode-toggle", () => ({
    ModeToggle: () => null,
}));
vi.mock("@/shared/components/ui/LanguageSwitcher", () => ({
    LanguageSwitcher: () => null,
}));
vi.mock("@/shared/components/ui/PanelNavbarControls", () => ({
    default: () => null,
}));
vi.mock("@/shared/components/ui/ProfileDropdown", () => ({
    default: () => null,
}));

const { Footer } = await import("@/shared/components/ui/Footer");
const { PageFormFooter } = await import(
    "@/shared/components/ui/PageFormFooter"
);
const { Container } = await import("@/shared/components/ui/Container");
const { default: Navbar } = await import("@/shared/components/ui/Navbar");

const layoutSource = readFileSync(join(__dirname, "../app/layout.tsx"), "utf8");

/**
 * The document reserves the sticky bars' height for focus scrolling through a `has-[...]`
 * selector on `<html>`. Renaming the attribute on one side only puts the focused field
 * back behind the bar, and nothing in the build notices.
 */
const SCROLL_PADDING =
    /has-\[(?<selector>\[data-[\w-]+\])\]:scroll-p(?<side>[bt])-(?<size>[\w-]+)/g;

const scrollPaddingBySide = new Map(
    [...layoutSource.matchAll(SCROLL_PADDING)].map((match) => [
        match.groups?.side,
        match.groups,
    ])
);
const actionBarSelector = String(scrollPaddingBySide.get("b")?.selector);
const navbarSelector = String(scrollPaddingBySide.get("t")?.selector);

afterEach(cleanup);

describe("folga de rolagem do foco sob as barras fixas", () => {
    it("o html reserva 80 px embaixo e em cima por seletor condicional", () => {
        expect(scrollPaddingBySide.get("b")?.size).toBe("20");
        expect(scrollPaddingBySide.get("t")?.size).toBe("20");
    });

    it("o Footer fixo publica o atributo da barra de ações", () => {
        const { container } = render(<Footer />);

        expect(container.querySelector(actionBarSelector)).not.toBeNull();
    });

    it("o Footer em linha não publica o atributo", () => {
        const { container } = render(<Footer sticky={false} />);

        expect(container.querySelector(actionBarSelector)).toBeNull();
    });

    it("o PageFormFooter publica o atributo da barra de ações", () => {
        const { container } = render(
            <PageFormFooter
                cancelLabel="Cancelar"
                onCancel={vi.fn()}
                submitLabel="Salvar"
            />
        );

        expect(container.querySelector(actionBarSelector)).not.toBeNull();
    });

    it("a barra de voltar do Container publica o atributo da barra de ações", () => {
        const { container } = render(<Container contentOnly showGoBack />);

        expect(container.querySelector(actionBarSelector)).not.toBeNull();
    });

    it("o Container sem barra não publica o atributo", () => {
        const { container } = render(<Container contentOnly />);

        expect(container.querySelector(actionBarSelector)).toBeNull();
    });

    it("o Navbar publica o atributo do topo", () => {
        const { container } = render(<Navbar />);

        expect(container.querySelector(navbarSelector)).not.toBeNull();
    });
});
