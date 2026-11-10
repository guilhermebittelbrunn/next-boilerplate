import { cleanup, render, screen } from "@testing-library/react";
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

vi.mock("@/shared/components/ui/LoadErrorState", () => ({
    LoadErrorState: ({ message }: { message: string }) => (
        <div role="alert">{message}</div>
    ),
}));

const { PageHeader } = await import("@/shared/components/ui/PageHeader");
const { Container } = await import("@/shared/components/ui/Container");
const { PageSkeleton } = await import("@/shared/components/ui/PageSkeleton");

afterEach(cleanup);

describe("PageHeader", () => {
    it("renderiza um único h1 com o título", () => {
        render(<PageHeader title="Entidades" />);

        const headings = screen.getAllByRole("heading", { level: 1 });
        expect(headings).toHaveLength(1);
        expect(headings[0]?.textContent).toBe("Entidades");
    });

    it("mostra descrição e ações só quando são passadas", () => {
        const { container, rerender } = render(<PageHeader title="Equipe" />);
        expect(container.querySelector("p")).toBeNull();
        expect(screen.queryByRole("button")).toBeNull();

        rerender(
            <PageHeader
                actions={<button type="button">Adicionar</button>}
                description="Quem tem acesso"
                title="Equipe"
            />
        );

        expect(screen.getByText("Quem tem acesso")).toBeTruthy();
        expect(screen.getByRole("button", { name: "Adicionar" })).toBeTruthy();
    });
});

describe("Container com cabeçalho de página", () => {
    const header = <PageHeader title="Minha conta" />;

    it("mantém o cabeçalho visível durante a carga", () => {
        render(
            <Container header={header} loading>
                <p>conteúdo</p>
            </Container>
        );

        expect(
            screen.getByRole("heading", { level: 1, name: "Minha conta" })
        ).toBeTruthy();
        expect(screen.queryByText("conteúdo")).toBeNull();
    });

    it("mantém o cabeçalho visível com erro de carga", () => {
        render(
            <Container header={header} loadError="Falhou">
                <p>conteúdo</p>
            </Container>
        );

        expect(
            screen.getByRole("heading", { level: 1, name: "Minha conta" })
        ).toBeTruthy();
        expect(screen.getByRole("alert").textContent).toBe("Falhou");
    });

    it("limita a largura só com width narrow", () => {
        const { container, rerender } = render(
            <Container header={header}>conteúdo</Container>
        );
        expect(container.firstElementChild?.className).not.toContain(
            "max-w-4xl"
        );

        rerender(
            <Container header={header} width="narrow">
                conteúdo
            </Container>
        );

        expect(container.firstElementChild?.className).toContain("max-w-4xl");
    });
});

describe("PageSkeleton", () => {
    const bodyOf = (container: HTMLElement) =>
        container.children.item(1) as HTMLElement | null;

    it("reserva a barra do breadcrumb com a mesma altura do Header", () => {
        const { container } = render(<PageSkeleton />);

        expect(container.firstElementChild?.className).toContain("h-16");
    });

    it("usa a mesma classe de corpo e de largura que o Container", () => {
        const { container: skeleton } = render(<PageSkeleton width="narrow" />);
        const skeletonBody = bodyOf(skeleton)?.className;
        cleanup();
        const { container: page } = render(
            <Container header={<PageHeader title="Conta" />} width="narrow">
                conteúdo
            </Container>
        );

        expect(skeletonBody).toBe(page.firstElementChild?.className);
    });

    it("só reserva descrição e ações quando a tela tem", () => {
        const countSkeletons = (element: HTMLElement | null) =>
            element?.querySelectorAll('[data-slot="skeleton"]').length ?? 0;

        const { container, rerender } = render(<PageSkeleton />);
        const bare = countSkeletons(bodyOf(container));

        rerender(<PageSkeleton actions description />);

        expect(countSkeletons(bodyOf(container))).toBe(bare + 2);
    });

    it("renderiza o corpo da carga abaixo do título", () => {
        render(
            <PageSkeleton>
                <p>tabela</p>
            </PageSkeleton>
        );

        expect(screen.getByText("tabela")).toBeTruthy();
    });
});
