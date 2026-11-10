import { describe, expect, it } from "vitest";
import { isNavUrlActive } from "@/shared/lib/navActive";

const query = (value: string) => new URLSearchParams(value);

describe("isNavUrlActive — item sem query", () => {
    it("ativa na própria página", () => {
        expect(
            isNavUrlActive("/pt-br/entities", "/pt-br/entities", query(""))
        ).toBe(true);
    });

    it("ativa nas páginas abaixo dela", () => {
        expect(
            isNavUrlActive(
                "/pt-br/entities",
                "/pt-br/entities/edit/1",
                query("")
            )
        ).toBe(true);
    });

    it("não ativa num caminho que só começa com o mesmo texto", () => {
        expect(
            isNavUrlActive(
                "/pt-br/entities",
                "/pt-br/entities-archive",
                query("")
            )
        ).toBe(false);
    });

    it("nunca ativa o link vazio #", () => {
        expect(isNavUrlActive("#", "/pt-br", query(""))).toBe(false);
    });
});

describe("isNavUrlActive — item com query", () => {
    const securityUrl = "/pt-br/account?tab=security";

    it("ativa quando o caminho e o parâmetro batem", () => {
        expect(
            isNavUrlActive(securityUrl, "/pt-br/account", query("tab=security"))
        ).toBe(true);
    });

    it("não ativa com outro valor no parâmetro", () => {
        expect(
            isNavUrlActive(securityUrl, "/pt-br/account", query("tab=privacy"))
        ).toBe(false);
    });

    it("não ativa sem o parâmetro na URL atual", () => {
        expect(isNavUrlActive(securityUrl, "/pt-br/account", query(""))).toBe(
            false
        );
    });

    it("exige o caminho igual, sem casar por prefixo", () => {
        expect(
            isNavUrlActive(
                securityUrl,
                "/pt-br/account/extra",
                query("tab=security")
            )
        ).toBe(false);
    });

    it("ignora parâmetros a mais na URL atual", () => {
        expect(
            isNavUrlActive(
                "/pt-br/account?tab=billing",
                "/pt-br/account",
                query("tab=billing&checkout=success&plan=price_1")
            )
        ).toBe(true);
    });

    it("exige todos os parâmetros do item", () => {
        expect(
            isNavUrlActive(
                "/pt-br/account?tab=billing&plan=price_1",
                "/pt-br/account",
                query("tab=billing")
            )
        ).toBe(false);
    });
});
