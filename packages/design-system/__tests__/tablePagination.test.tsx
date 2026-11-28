import { Table } from "@repo/design-system/components/ui/table";
import { getDictionary } from "@repo/internationalization/client";
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown> & { id: string; name: string };

const tableCopy = getDictionary().dictionary.components.table;
const EMPTY_TEXT = "Nenhum registro.";
const TOTAL_ROWS = 25;
const DEFAULT_PAGE_SIZE = 10;
const LARGER_PAGE_SIZE = 20;
const SMALLER_PAGE_SIZE = 5;
const PAGES_AT_SMALLER_SIZE = 5;
const PAGES_AT_DEFAULT_SIZE = 3;
const ROWS_ON_LAST_PAGE = 5;
const SKELETON_ROWS = 5;
const FEW_ROWS = 4;
const ROWS_ALREADY_LOADED = 3;
const ROWS_UNDER_LARGER_SIZE = 15;
const ROWS_UNDER_SMALLEST_SIZE = 8;
const SEARCH_ANNOUNCE_DELAY_MS = 500;
const KEYSTROKE_GAP_MS = 200;

function buildRows(count: number): Row[] {
    return Array.from({ length: count }, (_, index) => ({
        id: String(index + 1),
        name: `Registro ${String(index + 1).padStart(2, "0")}`,
    }));
}

function renderTable(props: Partial<Parameters<typeof Table<Row>>[0]> = {}) {
    return render(
        <Table<Row>
            columns={[{ dataIndex: "name", title: "Nome" }]}
            dataSource={buildRows(TOTAL_ROWS)}
            locale={{ emptyText: EMPTY_TEXT }}
            rowKey="id"
            {...props}
        />
    );
}

function bodyRows() {
    return screen.queryAllByRole("row").filter((row) => row.closest("tbody"));
}

function rowNames() {
    return bodyRows().map((row) => row.textContent);
}

function pageStatus(page: number, total: number) {
    return tableCopy.pageStatus
        .replace("{page}", String(page))
        .replace("{total}", String(total));
}

function nextButton() {
    return screen.getByRole("button", { name: tableCopy.nextPage });
}

function previousButton() {
    return screen.getByRole("button", { name: tableCopy.previousPage });
}

function searchField() {
    return screen.getByRole("searchbox", { name: tableCopy.searchLabel });
}

function typeInSearch(value: string) {
    fireEvent.change(searchField(), { target: { value } });
}

function noResultsText(term: string) {
    return tableCopy.searchNoResults.replace("{term}", term);
}

function fieldClearButton() {
    const fieldWrapper = searchField().parentElement;
    if (!fieldWrapper) {
        throw new Error("search field rendered without a wrapper");
    }
    return within(fieldWrapper).queryByRole("button", {
        name: tableCopy.clearSearch,
    });
}

function emptyStateClearButton() {
    return within(screen.getByRole("table")).queryByRole("button", {
        name: tableCopy.clearSearch,
    });
}

function resultsAnnouncement() {
    const region = screen
        .getAllByRole("status")
        .find((candidate) => candidate.getAttribute("aria-atomic") === "true");
    if (!region) {
        throw new Error("search results region is not mounted");
    }
    return region.textContent;
}

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

describe("paginação da Table", () => {
    it("mostra dez linhas por página por padrão e avança para a página seguinte", () => {
        renderTable();

        expect(bodyRows()).toHaveLength(DEFAULT_PAGE_SIZE);
        expect(
            screen.getByText(pageStatus(1, PAGES_AT_DEFAULT_SIZE))
        ).toBeTruthy();
        expect(previousButton().hasAttribute("disabled")).toBe(true);

        fireEvent.click(nextButton());

        expect(
            screen.getByText(pageStatus(2, PAGES_AT_DEFAULT_SIZE))
        ).toBeTruthy();
        expect(rowNames()[0]).toBe("Registro 11");
    });

    it("desabilita o avanço na última página, que mostra só o resto", () => {
        renderTable();

        fireEvent.click(nextButton());
        fireEvent.click(nextButton());

        expect(
            screen.getByText(
                pageStatus(PAGES_AT_DEFAULT_SIZE, PAGES_AT_DEFAULT_SIZE)
            )
        ).toBeTruthy();
        expect(bodyRows()).toHaveLength(ROWS_ON_LAST_PAGE);
        expect(nextButton().hasAttribute("disabled")).toBe(true);
    });

    it("troca o tamanho da página pelo seletor e volta para a primeira página", () => {
        renderTable({
            pagination: { pageSize: DEFAULT_PAGE_SIZE, showSizeChanger: true },
        });
        fireEvent.click(nextButton());
        expect(
            screen.getByText(pageStatus(2, PAGES_AT_DEFAULT_SIZE))
        ).toBeTruthy();

        const sizeSelect = screen.getByRole("combobox") as HTMLSelectElement;
        expect(sizeSelect.closest("label")?.textContent).toContain(
            tableCopy.rowsPerPage
        );
        expect(
            Array.from(sizeSelect.options).map((option) => option.value)
        ).toEqual(["10", "20", "50"]);

        fireEvent.change(sizeSelect, {
            target: { value: String(LARGER_PAGE_SIZE) },
        });

        expect(screen.getByText(pageStatus(1, 2))).toBeTruthy();
        expect(bodyRows()).toHaveLength(LARGER_PAGE_SIZE);
    });

    it("aplica um pageSize novo vindo da prop e volta para a primeira página", () => {
        const { rerender } = renderTable({
            pagination: { pageSize: DEFAULT_PAGE_SIZE },
        });
        fireEvent.click(nextButton());
        expect(
            screen.getByText(pageStatus(2, PAGES_AT_DEFAULT_SIZE))
        ).toBeTruthy();

        rerender(
            <Table<Row>
                columns={[{ dataIndex: "name", title: "Nome" }]}
                dataSource={buildRows(TOTAL_ROWS)}
                locale={{ emptyText: EMPTY_TEXT }}
                pagination={{ pageSize: SMALLER_PAGE_SIZE }}
                rowKey="id"
            />
        );

        expect(bodyRows()).toHaveLength(SMALLER_PAGE_SIZE);
        expect(
            screen.getByText(pageStatus(1, PAGES_AT_SMALLER_SIZE))
        ).toBeTruthy();
        expect(rowNames()[0]).toBe("Registro 01");
    });

    it("mantém o tamanho escolhido no seletor quando a tabela re-renderiza com a mesma prop", () => {
        const pagination = {
            pageSize: DEFAULT_PAGE_SIZE,
            showSizeChanger: true,
        };
        const { rerender } = renderTable({ pagination });
        fireEvent.change(screen.getByRole("combobox"), {
            target: { value: String(LARGER_PAGE_SIZE) },
        });
        expect(bodyRows()).toHaveLength(LARGER_PAGE_SIZE);

        rerender(
            <Table<Row>
                columns={[{ dataIndex: "name", title: "Nome" }]}
                dataSource={buildRows(TOTAL_ROWS)}
                locale={{ emptyText: EMPTY_TEXT }}
                pagination={{ ...pagination }}
                rowKey="id"
            />
        );

        expect(bodyRows()).toHaveLength(LARGER_PAGE_SIZE);
        expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe(
            String(LARGER_PAGE_SIZE)
        );
    });

    it("não oferece seletor de tamanho sem showSizeChanger", () => {
        renderTable();

        expect(screen.queryByRole("combobox")).toBeNull();
    });

    it("volta para a primeira página ao buscar", () => {
        renderTable({ searchFields: ["name"] });
        fireEvent.click(nextButton());
        fireEvent.click(nextButton());
        expect(
            screen.getByText(
                pageStatus(PAGES_AT_DEFAULT_SIZE, PAGES_AT_DEFAULT_SIZE)
            )
        ).toBeTruthy();

        fireEvent.change(
            screen.getByRole("searchbox", { name: tableCopy.searchLabel }),
            { target: { value: "registro 1" } }
        );

        expect(screen.getByText(pageStatus(1, 1))).toBeTruthy();
        expect(rowNames()[0]).toBe("Registro 10");
        expect(bodyRows()).toHaveLength(DEFAULT_PAGE_SIZE);
    });

    it("esconde o paginador quando tudo cabe numa página e hideOnSinglePage está ligado", () => {
        renderTable({
            dataSource: buildRows(FEW_ROWS),
            pagination: { hideOnSinglePage: true },
        });

        expect(bodyRows()).toHaveLength(FEW_ROWS);
        expect(screen.queryByText(pageStatus(1, 1))).toBeNull();
        expect(
            screen.queryByRole("button", { name: tableCopy.nextPage })
        ).toBeNull();
    });

    it("mantém o seletor quando o tamanho escolhido põe tudo numa página e um tamanho menor ainda pagina", () => {
        renderTable({
            dataSource: buildRows(ROWS_UNDER_LARGER_SIZE),
            pagination: { hideOnSinglePage: true, showSizeChanger: true },
        });
        expect(screen.getByText(pageStatus(1, 2))).toBeTruthy();

        fireEvent.change(screen.getByRole("combobox"), {
            target: { value: String(LARGER_PAGE_SIZE) },
        });

        expect(bodyRows()).toHaveLength(ROWS_UNDER_LARGER_SIZE);
        expect(screen.getByText(pageStatus(1, 1))).toBeTruthy();
        const sizeSelect = screen.getByRole("combobox") as HTMLSelectElement;
        expect(sizeSelect.value).toBe(String(LARGER_PAGE_SIZE));

        fireEvent.change(sizeSelect, {
            target: { value: String(DEFAULT_PAGE_SIZE) },
        });

        expect(bodyRows()).toHaveLength(DEFAULT_PAGE_SIZE);
        expect(screen.getByText(pageStatus(1, 2))).toBeTruthy();
    });

    it("esconde o paginador com seletor quando tudo cabe no menor tamanho oferecido", () => {
        renderTable({
            dataSource: buildRows(ROWS_UNDER_SMALLEST_SIZE),
            pagination: { hideOnSinglePage: true, showSizeChanger: true },
        });

        expect(bodyRows()).toHaveLength(ROWS_UNDER_SMALLEST_SIZE);
        expect(screen.queryByRole("combobox")).toBeNull();
        expect(screen.queryByText(pageStatus(1, 1))).toBeNull();
    });

    it("esconde o paginador sem seletor quando o pageSize configurado põe tudo numa página", () => {
        renderTable({
            dataSource: buildRows(ROWS_UNDER_LARGER_SIZE),
            pagination: { hideOnSinglePage: true, pageSize: LARGER_PAGE_SIZE },
        });

        expect(bodyRows()).toHaveLength(ROWS_UNDER_LARGER_SIZE);
        expect(screen.queryByText(pageStatus(1, 1))).toBeNull();
    });

    it("mantém o paginador de página única sem hideOnSinglePage", () => {
        renderTable({ dataSource: buildRows(FEW_ROWS) });

        expect(screen.getByText(pageStatus(1, 1))).toBeTruthy();
    });

    it("mostra todas as linhas sem paginador quando a paginação está desligada", () => {
        renderTable({ pagination: false });

        expect(bodyRows()).toHaveLength(TOTAL_ROWS);
        expect(
            screen.queryByRole("button", { name: tableCopy.nextPage })
        ).toBeNull();
    });
});

describe("estados da Table", () => {
    it("mostra o esqueleto e anuncia o carregamento enquanto ainda não há linhas", () => {
        const { container } = renderTable({ dataSource: [], loading: true });

        expect(
            container.querySelectorAll('tbody [data-slot="skeleton"]')
        ).toHaveLength(SKELETON_ROWS);
        expect(screen.getByRole("status").textContent).toBe(tableCopy.loading);
        expect(
            container.querySelector("table")?.getAttribute("aria-busy")
        ).toBe("true");
        expect(screen.queryByText(EMPTY_TEXT)).toBeNull();
    });

    it("mantém as linhas já carregadas durante uma nova busca, sem esqueleto", () => {
        const { container } = renderTable({
            dataSource: buildRows(ROWS_ALREADY_LOADED),
            loading: true,
        });

        expect(bodyRows()).toHaveLength(ROWS_ALREADY_LOADED);
        expect(
            container.querySelectorAll('tbody [data-slot="skeleton"]')
        ).toHaveLength(0);
    });

    it("mostra o texto de vazio do chamador e nenhum paginador quando não há linhas", () => {
        renderTable({ dataSource: [] });

        expect(screen.getByText(EMPTY_TEXT)).toBeTruthy();
        expect(
            screen.queryByRole("button", { name: tableCopy.nextPage })
        ).toBeNull();
    });

    it("diz que a busca não achou o termo em vez de dizer que a lista está vazia", () => {
        renderTable({ searchFields: ["name"] });

        typeInSearch("  inexistente  ");

        expect(screen.getByText(noResultsText("inexistente"))).toBeTruthy();
        expect(screen.queryByText(EMPTY_TEXT)).toBeNull();
        expect(emptyStateClearButton()).toBeTruthy();
        expect(bodyRows()).toHaveLength(1);
    });

    it("mantém o texto de vazio do chamador quando não há registro, mesmo com termo digitado", () => {
        renderTable({ dataSource: [], searchFields: ["name"] });

        typeInSearch("inexistente");

        expect(screen.getByText(EMPTY_TEXT)).toBeTruthy();
        expect(screen.queryByText(noResultsText("inexistente"))).toBeNull();
        expect(emptyStateClearButton()).toBeNull();
    });

    it("não trata termo só com espaços como busca", () => {
        renderTable({ dataSource: [], searchFields: ["name"] });

        typeInSearch("   ");

        expect(screen.getByText(EMPTY_TEXT)).toBeTruthy();
        expect(emptyStateClearButton()).toBeNull();
    });
});

describe("limpar a busca da Table", () => {
    it("o botão do vazio devolve as linhas, esvazia o campo e foca o campo", () => {
        renderTable({ searchFields: ["name"] });
        typeInSearch("inexistente");

        const clearButton = emptyStateClearButton();
        if (!clearButton) {
            throw new Error("empty state rendered without the clear action");
        }
        fireEvent.click(clearButton);

        expect(bodyRows()).toHaveLength(DEFAULT_PAGE_SIZE);
        expect((searchField() as HTMLInputElement).value).toBe("");
        expect(document.activeElement).toBe(searchField());
    });

    it("o botão do campo só existe com texto, limpa e foca o campo", () => {
        renderTable({ searchFields: ["name"] });
        expect(fieldClearButton()).toBeNull();

        typeInSearch("registro 1");
        const clearButton = fieldClearButton();
        if (!clearButton) {
            throw new Error("search field rendered without the clear button");
        }
        expect(bodyRows()).toHaveLength(DEFAULT_PAGE_SIZE);
        fireEvent.click(clearButton);

        expect((searchField() as HTMLInputElement).value).toBe("");
        expect(document.activeElement).toBe(searchField());
        expect(fieldClearButton()).toBeNull();
        expect(
            screen.getByText(pageStatus(1, PAGES_AT_DEFAULT_SIZE))
        ).toBeTruthy();
    });

    it("põe o botão do campo entre o campo e o Atualizar na ordem de Tab", () => {
        const { container } = renderTable({
            searchFields: ["name"],
            onRefresh: vi.fn(),
        });
        typeInSearch("registro");

        const toolbarControls = [
            searchField(),
            fieldClearButton(),
            screen.getByRole("button", { name: tableCopy.refresh }),
        ];
        const tabOrder = Array.from(
            container.querySelectorAll("input, button")
        ).slice(0, toolbarControls.length);

        expect(tabOrder).toEqual(toolbarControls);
    });
});

describe("anúncio do resultado da busca da Table", () => {
    it("fica em silêncio enquanto a pessoa digita e anuncia a contagem de todas as linhas filtradas depois da pausa", () => {
        vi.useFakeTimers();
        renderTable({ searchFields: ["name"] });
        expect(resultsAnnouncement()).toBe("");

        typeInSearch("registro");
        act(() => {
            vi.advanceTimersByTime(SEARCH_ANNOUNCE_DELAY_MS - 1);
        });
        expect(resultsAnnouncement()).toBe("");

        act(() => {
            vi.advanceTimersByTime(1);
        });
        expect(resultsAnnouncement()).toBe(
            tableCopy.searchResults.replace("{count}", String(TOTAL_ROWS))
        );
    });

    it("anuncia uma vez só, o termo final, quando as teclas chegam em sequência", () => {
        vi.useFakeTimers();
        renderTable({ searchFields: ["name"] });

        typeInSearch("registro");
        act(() => {
            vi.advanceTimersByTime(KEYSTROKE_GAP_MS);
        });
        typeInSearch("registro 2");
        act(() => {
            vi.advanceTimersByTime(KEYSTROKE_GAP_MS);
        });
        expect(resultsAnnouncement()).toBe("");

        act(() => {
            vi.advanceTimersByTime(SEARCH_ANNOUNCE_DELAY_MS);
        });
        expect(resultsAnnouncement()).toBe(
            tableCopy.searchResults.replace("{count}", "6")
        );
    });

    it("volta a esperar a pausa quando a pessoa retorna a um termo já anunciado", () => {
        vi.useFakeTimers();
        renderTable({ searchFields: ["name"] });

        typeInSearch("registro 2");
        act(() => {
            vi.advanceTimersByTime(SEARCH_ANNOUNCE_DELAY_MS);
        });
        typeInSearch("registro 25");
        typeInSearch("registro 2");

        expect(resultsAnnouncement()).toBe("");
    });

    it("usa o singular para um resultado e o texto de nenhum resultado para zero", () => {
        vi.useFakeTimers();
        renderTable({ searchFields: ["name"] });

        typeInSearch("registro 25");
        act(() => {
            vi.advanceTimersByTime(SEARCH_ANNOUNCE_DELAY_MS);
        });
        expect(resultsAnnouncement()).toBe(tableCopy.searchResultsOne);

        typeInSearch("inexistente");
        act(() => {
            vi.advanceTimersByTime(SEARCH_ANNOUNCE_DELAY_MS);
        });
        expect(resultsAnnouncement()).toBe(noResultsText("inexistente"));
    });

    it("anuncia a contagem nova quando mais linhas chegam com o termo parado", () => {
        vi.useFakeTimers();
        const { rerender } = renderTable({
            dataSource: buildRows(FEW_ROWS),
            searchFields: ["name"],
        });
        typeInSearch("registro");
        act(() => {
            vi.advanceTimersByTime(SEARCH_ANNOUNCE_DELAY_MS);
        });
        expect(resultsAnnouncement()).toBe(
            tableCopy.searchResults.replace("{count}", String(FEW_ROWS))
        );

        rerender(
            <Table<Row>
                columns={[{ dataIndex: "name", title: "Nome" }]}
                dataSource={buildRows(TOTAL_ROWS)}
                locale={{ emptyText: EMPTY_TEXT }}
                rowKey="id"
                searchFields={["name"]}
            />
        );

        expect(resultsAnnouncement()).toBe(
            tableCopy.searchResults.replace("{count}", String(TOTAL_ROWS))
        );
    });

    it("fica em silêncio enquanto o esqueleto aparece e anuncia a contagem quando as linhas chegam", () => {
        vi.useFakeTimers();
        const { rerender } = renderTable({
            dataSource: [],
            loading: true,
            searchFields: ["name"],
        });
        typeInSearch("registro");
        act(() => {
            vi.advanceTimersByTime(SEARCH_ANNOUNCE_DELAY_MS);
        });

        expect(resultsAnnouncement()).toBe("");

        rerender(
            <Table<Row>
                columns={[{ dataIndex: "name", title: "Nome" }]}
                dataSource={buildRows(TOTAL_ROWS)}
                locale={{ emptyText: EMPTY_TEXT }}
                rowKey="id"
                searchFields={["name"]}
            />
        );

        expect(resultsAnnouncement()).toBe(
            tableCopy.searchResults.replace("{count}", String(TOTAL_ROWS))
        );
    });

    it("não diz que a busca não achou nada enquanto um refresh sem linhas filtradas carrega", () => {
        vi.useFakeTimers();
        const { rerender } = renderTable({
            loading: true,
            searchFields: ["name"],
        });
        typeInSearch("inexistente");
        act(() => {
            vi.advanceTimersByTime(SEARCH_ANNOUNCE_DELAY_MS);
        });

        expect(resultsAnnouncement()).toBe("");

        rerender(
            <Table<Row>
                columns={[{ dataIndex: "name", title: "Nome" }]}
                dataSource={buildRows(TOTAL_ROWS)}
                locale={{ emptyText: EMPTY_TEXT }}
                rowKey="id"
                searchFields={["name"]}
            />
        );

        expect(resultsAnnouncement()).toBe(noResultsText("inexistente"));
    });

    it("não anuncia nada depois de limpar a busca", () => {
        vi.useFakeTimers();
        renderTable({ searchFields: ["name"] });
        typeInSearch("registro 25");
        act(() => {
            vi.advanceTimersByTime(SEARCH_ANNOUNCE_DELAY_MS);
        });

        fireEvent.click(fieldClearButton() as HTMLElement);
        act(() => {
            vi.advanceTimersByTime(SEARCH_ANNOUNCE_DELAY_MS);
        });

        expect(resultsAnnouncement()).toBe("");
    });

    it("cancela o anúncio pendente quando a tabela desmonta", () => {
        vi.useFakeTimers();
        const { unmount } = renderTable({ searchFields: ["name"] });
        typeInSearch("registro");

        unmount();

        expect(vi.getTimerCount()).toBe(0);
    });

    it("não monta a região de anúncio numa tabela sem busca", () => {
        renderTable();

        expect(screen.queryByRole("status")).toBeNull();
    });
});
