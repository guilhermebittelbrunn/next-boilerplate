import { Table } from "@repo/design-system/components/ui/table";
import { getDictionary } from "@repo/internationalization/client";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

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

afterEach(cleanup);

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

    it("mostra o texto de vazio quando a busca não encontra nada", () => {
        renderTable({ searchFields: ["name"] });

        fireEvent.change(
            screen.getByRole("searchbox", { name: tableCopy.searchLabel }),
            { target: { value: "inexistente" } }
        );

        expect(screen.getByText(EMPTY_TEXT)).toBeTruthy();
        expect(bodyRows()).toHaveLength(1);
    });
});
