import { LocaleProvider } from "@repo/internationalization/client";
import { type Locale, locales } from "@repo/internationalization/utils";
import { cleanup, render, screen } from "@testing-library/react";
import { Table } from "antd";
import { afterEach, describe, expect, it, vi } from "vitest";

const { params } = vi.hoisted(() => ({
    params: { locale: "pt-br" } as Record<string, string>,
}));

vi.mock("next/navigation", () => ({
    useParams: () => params,
}));

// jsdom ships without matchMedia, and the antd table subscribes to it on mount.
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

const { AntdAppProvider, antdLocales } = await import(
    "@repo/design-system/providers/antd-app"
);

const expectedPagination: Record<Locale, { sizeLabel: string; next: string }> =
    {
        "pt-br": { sizeLabel: "10 / página", next: "Próxima página" },
        en: { sizeLabel: "10 / page", next: "Next Page" },
        es: { sizeLabel: "10 / página", next: "Página siguiente" },
    };

const rows = Array.from({ length: 12 }, (_, index) => ({
    key: String(index),
    name: `row ${index}`,
}));

function UsersLikeTable() {
    return (
        <Table
            columns={[{ dataIndex: "name", key: "name", title: "name" }]}
            dataSource={rows}
            pagination={{ showSizeChanger: true }}
        />
    );
}

function tree(locale: Locale) {
    params.locale = locale;
    return (
        <LocaleProvider>
            <AntdAppProvider>
                <UsersLikeTable />
            </AntdAppProvider>
        </LocaleProvider>
    );
}

function paginatesIn(locale: Locale): boolean {
    const { sizeLabel, next } = expectedPagination[locale];
    return Boolean(screen.queryByTitle(sizeLabel) && screen.queryByTitle(next));
}

afterEach(cleanup);

describe("antd no idioma ativo", () => {
    it("tem um pacote de idioma do antd para cada idioma do produto", () => {
        expect(Object.keys(antdLocales).sort()).toEqual([...locales].sort());
        for (const locale of locales) {
            expect(antdLocales[locale].Pagination?.items_per_page).toBe(
                expectedPagination[locale].sizeLabel.replace("10 ", "")
            );
        }
    });

    it.each(locales)("pagina a tabela em %s", (locale) => {
        render(tree(locale));

        expect(paginatesIn(locale)).toBe(true);
    });

    it("troca o idioma da paginação sem remontar o provider", () => {
        const { rerender } = render(tree("pt-br"));
        expect(paginatesIn("pt-br")).toBe(true);

        rerender(tree("en"));
        expect(paginatesIn("en")).toBe(true);

        rerender(tree("es"));
        expect(paginatesIn("es")).toBe(true);
    });
});
