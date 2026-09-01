import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCookie, removeCookie, setCookie } from "../utils/helpers/cookies";

const EXPIRES_PATTERN = /expires=([^;]+)/;
const ONE_HOUR_IN_SECONDS = 3600;
const ONE_HOUR_IN_MS = 3_600_000;

function documentWith(cookie: string) {
    vi.stubGlobal("window", {});
    vi.stubGlobal("document", { cookie });
}

beforeEach(() => {
    documentWith("");
});

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

describe("setCookie", () => {
    it("grava o par nome/valor com path raiz e SameSite=Lax", () => {
        setCookie("x-locale", "es", 60);

        expect(document.cookie).toContain("x-locale=es;");
        expect(document.cookie).toContain("path=/");
        expect(document.cookie).toContain("SameSite=Lax");
    });

    it("interpreta o tempo de vida em segundos", () => {
        const now = new Date("2026-01-01T00:00:00.000Z");
        vi.useFakeTimers();
        vi.setSystemTime(now);

        setCookie("x-locale", "en", ONE_HOUR_IN_SECONDS);

        const expires = document.cookie.match(EXPIRES_PATTERN)?.[1] as string;

        expect(new Date(expires).getTime()).toBe(
            now.getTime() + ONE_HOUR_IN_MS
        );

        vi.useRealTimers();
    });

    it("não escreve nada quando não há document, como no servidor", () => {
        vi.stubGlobal("window", undefined);
        vi.stubGlobal("document", { cookie: "intacto" });

        setCookie("x-locale", "en", 60);

        expect(document.cookie).toBe("intacto");
    });
});

describe("removeCookie", () => {
    it("expira o cookie no passado mantendo o path raiz", () => {
        removeCookie("x-locale");

        expect(document.cookie).toContain("x-locale=;");
        expect(document.cookie).toContain(
            "expires=Thu, 01 Jan 1970 00:00:00 UTC"
        );
        expect(document.cookie).toContain("path=/");
    });

    it("não escreve nada quando não há document, como no servidor", () => {
        vi.stubGlobal("window", undefined);
        vi.stubGlobal("document", { cookie: "intacto" });

        removeCookie("x-locale");

        expect(document.cookie).toBe("intacto");
    });
});

describe("ida e volta", () => {
    it("lê de volta o valor que acabou de gravar", () => {
        setCookie("x-locale", "pt-br", 60);

        expect(getCookie("x-locale")).toBe("pt-br");
    });
});
