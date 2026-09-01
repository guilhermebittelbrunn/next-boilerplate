import { afterEach, describe, expect, it, vi } from "vitest";
import { getCookie } from "../utils/cookies";

function documentWith(cookie: string) {
    vi.stubGlobal("window", {});
    vi.stubGlobal("document", { cookie });
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("getCookie", () => {
    it("lê o único cookie do documento", () => {
        documentWith("x-locale=pt-br");

        expect(getCookie("x-locale")).toBe("pt-br");
    });

    it("ignora o espaço que separa os cookies", () => {
        documentWith("session=abc; x-locale=es");

        expect(getCookie("x-locale")).toBe("es");
    });

    it("não confunde um nome que é prefixo de outro", () => {
        documentWith("x-loc=errado; x-locale=en");

        expect(getCookie("x-loc")).toBe("errado");
        expect(getCookie("x-locale")).toBe("en");
    });

    it("não casa com o nome procurado quando ele aparece no valor de outro cookie", () => {
        documentWith("redirect=x-locale; x-locale=en");

        expect(getCookie("x-locale")).toBe("en");
    });

    it("devolve null quando o cookie não existe", () => {
        documentWith("session=abc");

        expect(getCookie("x-locale")).toBeNull();
    });

    it("devolve null quando o nome só aparece dentro do valor de outro cookie", () => {
        documentWith("redirect=x-locale");

        expect(getCookie("x-locale")).toBeNull();
    });

    it("devolve string vazia quando o cookie existe sem valor", () => {
        documentWith("session=abc; x-locale=");

        expect(getCookie("x-locale")).toBe("");
    });

    it("preserva o sinal de igual dentro do valor", () => {
        documentWith("token=YWJj=; x-locale=en");

        expect(getCookie("token")).toBe("YWJj=");
    });

    it("devolve null quando não há document, como no servidor", () => {
        vi.stubGlobal("window", undefined);

        expect(getCookie("x-locale")).toBeNull();
    });
});
