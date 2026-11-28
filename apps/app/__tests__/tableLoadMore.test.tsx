import { Table } from "@repo/design-system/components/ui/table";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// jsdom ships without matchMedia, which the responsive hooks of the panel read on mount.
window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
})) as unknown as typeof window.matchMedia;

type Row = Record<string, unknown> & { id: string; name: string };

const ROWS: Row[] = [
    { id: "1", name: "Acme" },
    { id: "2", name: "Globex" },
];

const CALLER_EMPTY_TEXT = "Nenhuma entidade cadastrada.";
const PENDING_PAGES_TEXT =
    "Nada encontrado no que já foi carregado. Carregue mais para continuar a busca.";
const CLEAR_SEARCH_LABEL = "Limpar busca";

function renderTable(props: Partial<Parameters<typeof Table<Row>>[0]> = {}) {
    return render(
        <Table<Row>
            columns={[{ dataIndex: "name", title: "Nome" }]}
            dataSource={ROWS}
            locale={{ emptyText: CALLER_EMPTY_TEXT }}
            rowKey="id"
            searchFields={["name"]}
            {...props}
        />
    );
}

function typeInSearch(value: string) {
    const field = screen.getByPlaceholderText("Buscar…");
    fireEvent.change(field, { target: { value } });
}

function emptyStateClearButton() {
    return within(screen.getByRole("table")).queryByRole("button", {
        name: CLEAR_SEARCH_LABEL,
    });
}

function loadMoreButton() {
    return screen.queryByRole("button", { name: "Carregar mais" });
}

afterEach(cleanup);

describe("Table com paginação por cursor", () => {
    it("avisa que a busca não alcançou as páginas pendentes em vez de dizer que não há registros", () => {
        renderTable({ hasMore: true, onLoadMore: vi.fn() });

        typeInSearch("registro da próxima página");

        expect(screen.getByText(PENDING_PAGES_TEXT)).toBeTruthy();
        expect(screen.queryByText(CALLER_EMPTY_TEXT)).toBeNull();
        expect(emptyStateClearButton()).toBeTruthy();
        expect(loadMoreButton()).toBeTruthy();
    });

    it("diz que a busca não achou o termo quando não há mais páginas para carregar", () => {
        renderTable({ hasMore: false, onLoadMore: vi.fn() });

        typeInSearch("registro inexistente");

        expect(
            screen.getByText("Nenhum resultado para “registro inexistente”.")
        ).toBeTruthy();
        expect(screen.queryByText(CALLER_EMPTY_TEXT)).toBeNull();
        expect(screen.queryByText(PENDING_PAGES_TEXT)).toBeNull();
        expect(emptyStateClearButton()).toBeTruthy();
    });

    it("mantém o texto de vazio do chamador quando a lista está vazia sem busca ativa", () => {
        renderTable({ dataSource: [], hasMore: true, onLoadMore: vi.fn() });

        expect(screen.getByText(CALLER_EMPTY_TEXT)).toBeTruthy();
        expect(screen.queryByText(PENDING_PAGES_TEXT)).toBeNull();
    });

    it("só oferece carregar mais quando o servidor indica página seguinte", () => {
        const onLoadMore = vi.fn();

        renderTable({ hasMore: false, onLoadMore });
        expect(loadMoreButton()).toBeNull();

        cleanup();
        renderTable({ hasMore: true, onLoadMore });
        const button = loadMoreButton();
        expect(button).toBeTruthy();

        button?.click();
        expect(onLoadMore).toHaveBeenCalledTimes(1);
    });

    it("desabilita o botão enquanto a página seguinte está sendo buscada", () => {
        const onLoadMore = vi.fn();

        renderTable({ hasMore: true, loadMoreLoading: true, onLoadMore });

        const button = screen
            .getAllByRole("button")
            .find((candidate) => candidate.hasAttribute("disabled"));

        expect(button).toBeTruthy();
        button?.click();
        expect(onLoadMore).not.toHaveBeenCalled();
    });
});
